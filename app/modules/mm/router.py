from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import usuario_atual, exige_perfis, Perfil
from app.modules.mm.schemas import (
    InsumoOut,
    FichaTecnicaOut,
    FichaItemIn,
    FornecedorOut,
    FornecedorCriar,
    CompraCriar,
    CompraOut,
    ItemCompraIn,
    LoteOut,
    LoteStatusIn,
)

router = APIRouter(prefix="/mm", tags=["Gestao de Materiais"])

PERFIS_LEITURA = (Perfil.COZINHA, Perfil.GERENTE, Perfil.SUPERVISOR)
PERFIS_GESTAO = (Perfil.GERENTE, Perfil.SUPERVISOR)


@router.get("/status")
async def status_mm(
    db: AsyncSession = Depends(get_db),
    _usuario: dict = Depends(usuario_atual),
):
    await db.execute(text("SELECT 1"))
    return {"modulo": "mm", "status": "disponivel"}


# ---------------------------------------------------------------------------
# Insumos
# ---------------------------------------------------------------------------

@router.get("/insumos", response_model=list[InsumoOut])
async def listar_insumos(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_LEITURA)),
):
    r = await db.execute(text("""
        SELECT insumo_id, nome, unidade_medida, quantidade_estoque,
               estoque_minimo, data_validade, perecivel,
               (quantidade_estoque < estoque_minimo) AS abaixo_minimo
        FROM mm.insumos ORDER BY nome
    """))
    return r.mappings().all()


# ---------------------------------------------------------------------------
# Ficha Técnica (mm.ficha_tecnica)
# ---------------------------------------------------------------------------

@router.get("/pratos/{prato_id}/ficha", response_model=FichaTecnicaOut)
async def ver_ficha(
    prato_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_LEITURA)),
):
    prato_nome = (await db.execute(
        text("SELECT nome FROM crm.pratos WHERE prato_id = :id"),
        {"id": prato_id},
    )).scalar()
    if prato_nome is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prato não encontrado")

    itens = (await db.execute(text("""
        SELECT ft.insumo_id, i.nome AS insumo_nome, i.unidade_medida,
               ft.quantidade_necessaria
        FROM mm.ficha_tecnica ft
        JOIN mm.insumos i ON i.insumo_id = ft.insumo_id
        WHERE ft.prato_id = :id
        ORDER BY i.nome
    """), {"id": prato_id})).mappings().all()
    return FichaTecnicaOut(prato_id=prato_id, prato_nome=prato_nome, itens=list(itens))


@router.put("/pratos/{prato_id}/ficha/itens", response_model=FichaTecnicaOut)
async def definir_item_ficha(
    prato_id: int,
    dados: FichaItemIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    """Adiciona ou atualiza a quantidade de um insumo na ficha do prato."""
    existe_prato = (await db.execute(
        text("SELECT 1 FROM crm.pratos WHERE prato_id = :id"), {"id": prato_id}
    )).scalar()
    if not existe_prato:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prato não encontrado")
    existe_insumo = (await db.execute(
        text("SELECT 1 FROM mm.insumos WHERE insumo_id = :id"),
        {"id": dados.insumo_id},
    )).scalar()
    if not existe_insumo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Insumo não encontrado")

    await db.execute(text("""
        INSERT INTO mm.ficha_tecnica (prato_id, insumo_id, quantidade_necessaria)
        VALUES (:p, :i, :q)
        ON CONFLICT (prato_id, insumo_id)
        DO UPDATE SET quantidade_necessaria = EXCLUDED.quantidade_necessaria
    """), {"p": prato_id, "i": dados.insumo_id, "q": dados.quantidade_necessaria})
    await db.commit()
    return await ver_ficha(prato_id, db)  # type: ignore[arg-type]


@router.delete("/pratos/{prato_id}/ficha/itens/{insumo_id}", response_model=FichaTecnicaOut)
async def remover_item_ficha(
    prato_id: int,
    insumo_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    r = await db.execute(text("""
        DELETE FROM mm.ficha_tecnica
        WHERE prato_id = :p AND insumo_id = :i
    """), {"p": prato_id, "i": insumo_id})
    if r.rowcount == 0:
        await db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item da ficha não encontrado")
    await db.commit()
    return await ver_ficha(prato_id, db)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# Fornecedores
# ---------------------------------------------------------------------------

@router.get("/fornecedores", response_model=list[FornecedorOut])
async def listar_fornecedores(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    r = await db.execute(text("""
        SELECT fornecedor_id, razao_social, cnpj, contato, ativo
        FROM mm.fornecedores ORDER BY razao_social
    """))
    return r.mappings().all()


@router.post("/fornecedores", response_model=FornecedorOut, status_code=201)
async def criar_fornecedor(
    dados: FornecedorCriar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    try:
        r = await db.execute(text("""
            INSERT INTO mm.fornecedores (razao_social, cnpj, contato)
            VALUES (:razao_social, :cnpj, :contato)
            RETURNING fornecedor_id, razao_social, cnpj, contato, ativo
        """), dados.model_dump())
        linha = r.mappings().one()
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe fornecedor com esse CNPJ")
    return linha


# ---------------------------------------------------------------------------
# Compras (mm.pedidos_compra + itens_compra) e recebimento
# ---------------------------------------------------------------------------

async def _montar_compra(db: AsyncSession, compra_id: int) -> CompraOut:
    cab = (await db.execute(text("""
        SELECT pc.compra_id, pc.fornecedor_id, f.razao_social AS fornecedor_nome,
               pc.status, pc.criado_em, pc.recebido_em
        FROM mm.pedidos_compra pc
        JOIN mm.fornecedores f ON f.fornecedor_id = pc.fornecedor_id
        WHERE pc.compra_id = :id
    """), {"id": compra_id})).mappings().first()
    if cab is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Compra não encontrada")

    itens = (await db.execute(text("""
        SELECT ic.item_compra_id, ic.insumo_id, i.nome AS insumo_nome,
               ic.quantidade, ic.preco_unitario, ic.validade
        FROM mm.itens_compra ic
        JOIN mm.insumos i ON i.insumo_id = ic.insumo_id
        WHERE ic.compra_id = :id
        ORDER BY ic.item_compra_id
    """), {"id": compra_id})).mappings().all()

    total = sum(float(it["quantidade"]) * float(it["preco_unitario"]) for it in itens)
    return CompraOut(
        compra_id=cab["compra_id"],
        fornecedor_id=cab["fornecedor_id"],
        fornecedor_nome=cab["fornecedor_nome"],
        status=cab["status"],
        criado_em=cab["criado_em"],
        recebido_em=cab["recebido_em"],
        valor_total=round(total, 2),
        itens=list(itens),
    )


@router.get("/compras", response_model=list[CompraOut])
async def listar_compras(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    ids = (await db.execute(text(
        "SELECT compra_id FROM mm.pedidos_compra ORDER BY criado_em DESC"
    ))).scalars().all()
    return [await _montar_compra(db, cid) for cid in ids]


@router.post("/compras", response_model=CompraOut, status_code=201)
async def criar_compra(
    dados: CompraCriar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    forn = (await db.execute(
        text("SELECT 1 FROM mm.fornecedores WHERE fornecedor_id = :id"),
        {"id": dados.fornecedor_id},
    )).scalar()
    if not forn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Fornecedor não encontrado")

    compra_id = (await db.execute(text("""
        INSERT INTO mm.pedidos_compra (fornecedor_id) VALUES (:f)
        RETURNING compra_id
    """), {"f": dados.fornecedor_id})).scalar()
    await db.commit()
    return await _montar_compra(db, compra_id)


@router.post("/compras/{compra_id}/itens", response_model=CompraOut, status_code=201)
async def adicionar_item_compra(
    compra_id: int,
    dados: ItemCompraIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    cab = (await db.execute(
        text("SELECT status FROM mm.pedidos_compra WHERE compra_id = :id"),
        {"id": compra_id},
    )).mappings().first()
    if cab is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Compra não encontrada")
    if cab["status"] != "rascunho":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Só é possível adicionar itens a compras em rascunho",
        )

    await db.execute(text("""
        INSERT INTO mm.itens_compra (compra_id, insumo_id, quantidade, preco_unitario, validade)
        VALUES (:c, :i, :q, :p, :v)
    """), {
        "c": compra_id, "i": dados.insumo_id, "q": dados.quantidade,
        "p": dados.preco_unitario, "v": dados.validade,
    })
    await db.commit()
    return await _montar_compra(db, compra_id)


@router.post("/compras/{compra_id}/enviar", response_model=CompraOut)
async def enviar_compra(
    compra_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    cab = (await db.execute(
        text("SELECT status FROM mm.pedidos_compra WHERE compra_id = :id"),
        {"id": compra_id},
    )).mappings().first()
    if cab is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Compra não encontrada")
    if cab["status"] != "rascunho":
        raise HTTPException(status.HTTP_409_CONFLICT, "A compra não está em rascunho")

    tem_itens = (await db.execute(
        text("SELECT COUNT(*) FROM mm.itens_compra WHERE compra_id = :id"),
        {"id": compra_id},
    )).scalar()
    if not tem_itens:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Adicione itens antes de enviar")

    await db.execute(text("""
        UPDATE mm.pedidos_compra SET status = 'enviado' WHERE compra_id = :id
    """), {"id": compra_id})
    await db.commit()
    return await _montar_compra(db, compra_id)


@router.post("/compras/{compra_id}/receber", response_model=CompraOut)
async def receber_compra(
    compra_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    """Recebe a compra: a procedure do banco cria lotes, soma o estoque,
    registra a movimentação e gera a conta a pagar automaticamente."""
    try:
        # CALL de procedure: usa conexão em modo autocommit implícito do asyncpg.
        await db.execute(text("CALL mm.receber_compra(:id)"), {"id": compra_id})
        await db.commit()
    except DBAPIError as e:
        await db.rollback()
        # A procedure levanta exceção se a compra não está 'enviado'.
        raise HTTPException(status.HTTP_409_CONFLICT, str(e.orig))
    return await _montar_compra(db, compra_id)


# ---------------------------------------------------------------------------
# Lotes (controle de validade / bloqueio de produto estragado)
# ---------------------------------------------------------------------------

@router.get("/lotes", response_model=list[LoteOut])
async def listar_lotes(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_LEITURA)),
):
    r = await db.execute(text("""
        SELECT l.lote_id, l.insumo_id, i.nome AS insumo_nome, l.codigo_lote,
               l.quantidade_inicial, l.validade, l.status
        FROM mm.lotes l
        JOIN mm.insumos i ON i.insumo_id = l.insumo_id
        ORDER BY l.validade NULLS LAST, l.lote_id
    """))
    return r.mappings().all()


@router.patch("/lotes/{lote_id}/status", response_model=LoteOut)
async def alterar_status_lote(
    lote_id: int,
    dados: LoteStatusIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    r = await db.execute(text("""
        UPDATE mm.lotes SET status = :st WHERE lote_id = :id RETURNING lote_id
    """), {"st": dados.status, "id": lote_id})
    if r.first() is None:
        await db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lote não encontrado")
    await db.commit()

    linha = (await db.execute(text("""
        SELECT l.lote_id, l.insumo_id, i.nome AS insumo_nome, l.codigo_lote,
               l.quantidade_inicial, l.validade, l.status
        FROM mm.lotes l JOIN mm.insumos i ON i.insumo_id = l.insumo_id
        WHERE l.lote_id = :id
    """), {"id": lote_id})).mappings().first()
    return linha
