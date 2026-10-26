from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import exige_perfis, funcionario_do_usuario, Perfil
from app.modules.crm.schemas_pedido import (
    PedidoAbrir,
    ItemAdicionar,
    PedidoResumo,
    PedidoDetalhe,
    StatusPedidoIn,
)

router = APIRouter(prefix="/crm/pedidos", tags=["Pedidos"])

PERFIS_OPERACAO = (
    Perfil.GARCOM,
    Perfil.COZINHA,
    Perfil.GERENTE,
    Perfil.SUPERVISOR,
)


async def _recalcular_total(db: AsyncSession, pedido_id: int, data_abertura) -> float:
    """Soma os subtotais dos itens e grava em crm.pedidos.valor_total."""
    total = (await db.execute(text("""
        SELECT COALESCE(SUM(subtotal), 0)
        FROM crm.itens_pedido
        WHERE pedido_id = :pid AND pedido_data_abertura = :dt
    """), {"pid": pedido_id, "dt": data_abertura})).scalar()
    await db.execute(text("""
        UPDATE crm.pedidos SET valor_total = :total
        WHERE pedido_id = :pid AND data_abertura = :dt
    """), {"total": total, "pid": pedido_id, "dt": data_abertura})
    return float(total)


async def _buscar_pedido(db: AsyncSession, pedido_id: int):
    """Retorna a linha do pedido (cabeçalho + mesa + cliente) ou None."""
    r = await db.execute(text("""
        SELECT p.pedido_id, p.data_abertura, p.mesa_id, m.numero AS mesa_numero,
               p.cliente_id, cl.nome AS cliente_nome,
               p.canal, p.status, p.valor_total
        FROM crm.pedidos p
        LEFT JOIN crm.mesas m ON m.mesa_id = p.mesa_id
        LEFT JOIN crm.clientes cl ON cl.cliente_id = p.cliente_id
        WHERE p.pedido_id = :pid
    """), {"pid": pedido_id})
    return r.mappings().first()


def _detalhe(cab, itens) -> PedidoDetalhe:
    return PedidoDetalhe(
        pedido_id=cab["pedido_id"],
        data_abertura=cab["data_abertura"],
        mesa_id=cab["mesa_id"],
        mesa_numero=cab["mesa_numero"],
        cliente_id=cab["cliente_id"],
        cliente_nome=cab["cliente_nome"],
        canal=cab["canal"],
        status=cab["status"],
        valor_total=float(cab["valor_total"]),
        itens=list(itens),
    )


async def _itens_do_pedido(db: AsyncSession, pedido_id: int, data_abertura):
    r = await db.execute(text("""
        SELECT i.item_id, i.prato_id, pr.nome AS prato_nome, i.quantidade,
               i.preco_unitario_registrado, i.subtotal, i.status_producao
        FROM crm.itens_pedido i
        JOIN crm.pratos pr ON pr.prato_id = i.prato_id
        WHERE i.pedido_id = :pid AND i.pedido_data_abertura = :dt
        ORDER BY i.item_id
    """), {"pid": pedido_id, "dt": data_abertura})
    return r.mappings().all()


@router.get("", response_model=list[PedidoResumo])
async def listar_pedidos(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_OPERACAO)),
):
    r = await db.execute(text("""
        SELECT p.pedido_id, p.data_abertura, p.mesa_id, m.numero AS mesa_numero,
               p.cliente_id, cl.nome AS cliente_nome,
               p.canal, p.status, p.valor_total,
               (SELECT COUNT(*) FROM crm.itens_pedido i
                 WHERE i.pedido_id = p.pedido_id
                   AND i.pedido_data_abertura = p.data_abertura) AS qtd_itens
        FROM crm.pedidos p
        LEFT JOIN crm.mesas m ON m.mesa_id = p.mesa_id
        LEFT JOIN crm.clientes cl ON cl.cliente_id = p.cliente_id
        ORDER BY p.data_abertura DESC, p.pedido_id DESC
    """))
    return r.mappings().all()


@router.post("", response_model=PedidoDetalhe, status_code=201)
async def abrir_pedido(
    dados: PedidoAbrir,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_OPERACAO)),
    funcionario_id: int = Depends(funcionario_do_usuario),
):
    # Se veio mesa, valida existência e marca como ocupada.
    if dados.mesa_id is not None:
        mesa = (await db.execute(
            text("SELECT status FROM crm.mesas WHERE mesa_id = :id"),
            {"id": dados.mesa_id},
        )).scalar()
        if mesa is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Mesa não encontrada")

    # Se veio cliente, valida.
    if dados.cliente_id is not None:
        cli = (await db.execute(
            text("SELECT 1 FROM crm.clientes WHERE cliente_id = :id AND ativo"),
            {"id": dados.cliente_id},
        )).scalar()
        if cli is None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "Cliente não encontrado ou inativo"
            )

    try:
        r = await db.execute(text("""
            INSERT INTO crm.pedidos (mesa_id, cliente_id, funcionario_id, canal)
            VALUES (:mesa_id, :cliente_id, :func, :canal)
            RETURNING pedido_id, data_abertura
        """), {
            "mesa_id": dados.mesa_id,
            "cliente_id": dados.cliente_id,
            "func": funcionario_id,
            "canal": dados.canal,
        })
        novo = r.mappings().one()

        # Ocupa a mesa associada, se houver.
        if dados.mesa_id is not None:
            await db.execute(text("""
                UPDATE crm.mesas SET status = 'ocupada'
                WHERE mesa_id = :id AND status <> 'ocupada'
            """), {"id": dados.mesa_id})

        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Não foi possível abrir o pedido: {e.orig}",
        )

    cab = await _buscar_pedido(db, novo["pedido_id"])
    return _detalhe(cab, [])


@router.get("/{pedido_id}", response_model=PedidoDetalhe)
async def ver_pedido(
    pedido_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_OPERACAO)),
):
    cab = await _buscar_pedido(db, pedido_id)
    if cab is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido não encontrado")
    itens = await _itens_do_pedido(db, pedido_id, cab["data_abertura"])
    return _detalhe(cab, itens)


@router.post("/{pedido_id}/itens", response_model=PedidoDetalhe, status_code=201)
async def adicionar_item(
    pedido_id: int,
    dados: ItemAdicionar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_OPERACAO)),
):
    cab = await _buscar_pedido(db, pedido_id)
    if cab is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido não encontrado")
    if cab["status"] in ("pago", "cancelado"):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Pedido {cab['status']}: não é possível adicionar itens",
        )

    # Usa o preço atual do prato como preço registrado do item.
    prato = (await db.execute(text("""
        SELECT preco_atual FROM crm.pratos WHERE prato_id = :id AND ativo
    """), {"id": dados.prato_id})).scalar()
    if prato is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Prato não encontrado ou inativo"
        )

    await db.execute(text("""
        INSERT INTO crm.itens_pedido
            (pedido_id, pedido_data_abertura, prato_id, quantidade,
             preco_unitario_registrado)
        VALUES (:pid, :dt, :prato, :qtd, :preco)
    """), {
        "pid": pedido_id,
        "dt": cab["data_abertura"],
        "prato": dados.prato_id,
        "qtd": dados.quantidade,
        "preco": prato,
    })
    await _recalcular_total(db, pedido_id, cab["data_abertura"])
    await db.commit()

    return await ver_pedido(pedido_id, db)  # type: ignore[arg-type]


@router.delete("/{pedido_id}/itens/{item_id}", response_model=PedidoDetalhe)
async def remover_item(
    pedido_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_OPERACAO)),
):
    cab = await _buscar_pedido(db, pedido_id)
    if cab is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido não encontrado")

    r = await db.execute(text("""
        DELETE FROM crm.itens_pedido
        WHERE item_id = :iid AND pedido_id = :pid AND pedido_data_abertura = :dt
    """), {"iid": item_id, "pid": pedido_id, "dt": cab["data_abertura"]})
    if r.rowcount == 0:
        await db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item não encontrado")

    await _recalcular_total(db, pedido_id, cab["data_abertura"])
    await db.commit()
    return await ver_pedido(pedido_id, db)  # type: ignore[arg-type]


@router.patch("/{pedido_id}/status", response_model=PedidoDetalhe)
async def alterar_status_pedido(
    pedido_id: int,
    dados: StatusPedidoIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_OPERACAO)),
):
    cab = await _buscar_pedido(db, pedido_id)
    if cab is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido não encontrado")

    era_pago = cab["status"] == "pago"

    await db.execute(text("""
        UPDATE crm.pedidos SET status = :st
        WHERE pedido_id = :pid AND data_abertura = :dt
    """), {"st": dados.status, "pid": pedido_id, "dt": cab["data_abertura"]})

    # Ao fechar/cancelar, libera a mesa.
    if dados.status in ("pago", "cancelado") and cab["mesa_id"] is not None:
        await db.execute(text("""
            UPDATE crm.mesas SET status = 'livre' WHERE mesa_id = :id
        """), {"id": cab["mesa_id"]})

    # Fidelidade: ao marcar como pago (e ainda não estava pago), credita
    # pontos ao cliente — 1 ponto por real do valor total do pedido.
    if dados.status == "pago" and not era_pago and cab["cliente_id"] is not None:
        pontos = int(float(cab["valor_total"]))
        if pontos > 0:
            await db.execute(text("""
                UPDATE crm.clientes
                SET pontos_fidelidade = pontos_fidelidade + :p
                WHERE cliente_id = :id
            """), {"p": pontos, "id": cab["cliente_id"]})

    await db.commit()
    return await ver_pedido(pedido_id, db)  # type: ignore[arg-type]
