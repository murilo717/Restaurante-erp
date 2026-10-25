from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import usuario_atual, exige_perfis, Perfil
from app.modules.pp.schemas import (
    ItemKDS,
    StatusProducaoIn,
    CentroOut,
    OrdemProducaoOut,
    OrdemProducaoCriar,
    OrdemStatusIn,
    CapacidadeCentroOut,
)

router = APIRouter(prefix="/pp", tags=["Producao"])

# Cozinha, supervisão e gestão operam a produção.
PERFIS_COZINHA = (Perfil.COZINHA, Perfil.GERENTE, Perfil.SUPERVISOR)
PERFIS_PRODUCAO = (Perfil.GERENTE, Perfil.SUPERVISOR, Perfil.COZINHA)


@router.get("/status")
async def status_pp(
    db: AsyncSession = Depends(get_db),
    _usuario: dict = Depends(usuario_atual),
):
    await db.execute(text("SELECT 1"))
    return {"modulo": "pp", "status": "disponivel"}


# ---------------------------------------------------------------------------
# KDS — fila da cozinha (crm.itens_pedido.status_producao)
# ---------------------------------------------------------------------------

@router.get("/kds", response_model=list[ItemKDS])
async def painel_kds(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_COZINHA)),
):
    """Itens a produzir: de pedidos ainda não pagos/cancelados, que ainda
    não foram entregues pela cozinha."""
    r = await db.execute(text("""
        SELECT i.item_id, i.pedido_id, m.numero AS mesa_numero, p.canal,
               pr.nome AS prato_nome, i.quantidade, i.status_producao,
               p.status AS pedido_status, p.data_abertura
        FROM crm.itens_pedido i
        JOIN crm.pedidos p
          ON p.pedido_id = i.pedido_id AND p.data_abertura = i.pedido_data_abertura
        JOIN crm.pratos pr ON pr.prato_id = i.prato_id
        LEFT JOIN crm.mesas m ON m.mesa_id = p.mesa_id
        WHERE p.status NOT IN ('pago', 'cancelado')
          AND i.status_producao <> 'entregue'
        ORDER BY p.data_abertura, i.item_id
    """))
    return r.mappings().all()


@router.patch("/kds/{item_id}", response_model=ItemKDS)
async def avancar_status_item(
    item_id: int,
    dados: StatusProducaoIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_COZINHA)),
):
    r = await db.execute(text("""
        UPDATE crm.itens_pedido SET status_producao = :st
        WHERE item_id = :id
        RETURNING item_id
    """), {"st": dados.status_producao, "id": item_id})
    if r.first() is None:
        await db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item não encontrado")
    await db.commit()

    linha = (await db.execute(text("""
        SELECT i.item_id, i.pedido_id, m.numero AS mesa_numero, p.canal,
               pr.nome AS prato_nome, i.quantidade, i.status_producao,
               p.status AS pedido_status, p.data_abertura
        FROM crm.itens_pedido i
        JOIN crm.pedidos p
          ON p.pedido_id = i.pedido_id AND p.data_abertura = i.pedido_data_abertura
        JOIN crm.pratos pr ON pr.prato_id = i.prato_id
        LEFT JOIN crm.mesas m ON m.mesa_id = p.mesa_id
        WHERE i.item_id = :id
    """), {"id": item_id})).mappings().first()
    return linha


# ---------------------------------------------------------------------------
# Centros de trabalho e Ordens de Produção
# ---------------------------------------------------------------------------

@router.get("/centros", response_model=list[CentroOut])
async def listar_centros(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_PRODUCAO)),
):
    r = await db.execute(text("""
        SELECT centro_id, nome, capacidade_porcoes_hora
        FROM pp.centros_trabalho ORDER BY nome
    """))
    return r.mappings().all()


@router.get("/capacidade", response_model=list[CapacidadeCentroOut])
async def capacidade_centros(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_PRODUCAO)),
):
    r = await db.execute(text("""
        SELECT centro_id, centro, data_prevista, porcoes_planejadas,
               capacidade_dia, ocupacao_pct
        FROM pp.vw_capacidade_centro
        ORDER BY data_prevista, centro
    """))
    return r.mappings().all()


async def _buscar_op(db: AsyncSession, op_id: int):
    r = await db.execute(text("""
        SELECT o.op_id, o.prato_id, pr.nome AS prato_nome, o.centro_id,
               c.nome AS centro_nome, o.quantidade, o.status, o.data_prevista,
               o.iniciada_em, o.concluida_em
        FROM pp.ordens_producao o
        JOIN crm.pratos pr ON pr.prato_id = o.prato_id
        JOIN pp.centros_trabalho c ON c.centro_id = o.centro_id
        WHERE o.op_id = :id
    """), {"id": op_id})
    return r.mappings().first()


@router.get("/ordens", response_model=list[OrdemProducaoOut])
async def listar_ordens(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_PRODUCAO)),
):
    r = await db.execute(text("""
        SELECT o.op_id, o.prato_id, pr.nome AS prato_nome, o.centro_id,
               c.nome AS centro_nome, o.quantidade, o.status, o.data_prevista,
               o.iniciada_em, o.concluida_em
        FROM pp.ordens_producao o
        JOIN crm.pratos pr ON pr.prato_id = o.prato_id
        JOIN pp.centros_trabalho c ON c.centro_id = o.centro_id
        ORDER BY o.data_prevista DESC, o.op_id DESC
    """))
    return r.mappings().all()


@router.post("/ordens", response_model=OrdemProducaoOut, status_code=201)
async def criar_ordem(
    dados: OrdemProducaoCriar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(Perfil.GERENTE, Perfil.SUPERVISOR)),
):
    # Valida prato e centro.
    prato = (await db.execute(
        text("SELECT 1 FROM crm.pratos WHERE prato_id = :id"),
        {"id": dados.prato_id},
    )).scalar()
    if not prato:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prato não encontrado")
    centro = (await db.execute(
        text("SELECT 1 FROM pp.centros_trabalho WHERE centro_id = :id"),
        {"id": dados.centro_id},
    )).scalar()
    if not centro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Centro não encontrado")

    params = {
        "prato": dados.prato_id,
        "centro": dados.centro_id,
        "qtd": dados.quantidade,
        "data": dados.data_prevista,
    }
    if dados.data_prevista is None:
        r = await db.execute(text("""
            INSERT INTO pp.ordens_producao (prato_id, centro_id, quantidade)
            VALUES (:prato, :centro, :qtd) RETURNING op_id
        """), params)
    else:
        r = await db.execute(text("""
            INSERT INTO pp.ordens_producao (prato_id, centro_id, quantidade, data_prevista)
            VALUES (:prato, :centro, :qtd, :data) RETURNING op_id
        """), params)
    op_id = r.scalar()
    await db.commit()
    return await _buscar_op(db, op_id)


@router.patch("/ordens/{op_id}/status", response_model=OrdemProducaoOut)
async def alterar_status_op(
    op_id: int,
    dados: OrdemStatusIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_PRODUCAO)),
):
    # A trigger pp.fn_op_status preenche iniciada_em/concluida_em.
    r = await db.execute(text("""
        UPDATE pp.ordens_producao SET status = :st WHERE op_id = :id
        RETURNING op_id
    """), {"st": dados.status, "id": op_id})
    if r.first() is None:
        await db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ordem não encontrada")
    await db.commit()
    return await _buscar_op(db, op_id)
