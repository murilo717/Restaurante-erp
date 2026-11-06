from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Literal
from app.core.database import get_db, engine
from app.core.security import exige_perfis, Perfil, funcionario_do_usuario
from app.modules.fi.schemas import (
    ContaPagarOut,
    ContaPagarCriar,
    ContaReceberOut,
    ContaReceberCriar,
    FluxoCaixaLinha,
    FechamentoCaixaOut,
    FecharCaixaIn,
    PedidoPagamentoResumo,
    PagamentoRegistrado,
)
from decimal import Decimal

router = APIRouter(prefix="/financeiro", tags=["Gestão Financeira"])

# Gestão financeira: gerente/supervisor. Auditor lê.
PERFIS_FIN = (Perfil.GERENTE, Perfil.SUPERVISOR)
PERFIS_FIN_LEITURA = (Perfil.GERENTE, Perfil.SUPERVISOR, Perfil.AUDITOR)


PERFIS_PAGAMENTO = (Perfil.GARCOM, Perfil.GERENTE)


class PagamentoIn(BaseModel):
    pedido_id: int
    forma_pagamento: Literal["dinheiro", "debito", "credito", "pix", "ifood"]
    # Opcionais: se omitidos, o sistema usa o que está registrado no pedido.
    # - pedido_data_abertura: lida do próprio pedido (chave composta no banco).
    # - valor: saldo a pagar do pedido (valor total menos o já pago).
    pedido_data_abertura: datetime | None = None
    valor: float | None = Field(default=None, ge=0)


async def _resumo_pedido(
    db: AsyncSession,
    pedido_id: int,
    data_abertura: datetime | None = None,
    travar: bool = False,
):
    """Busca o pedido pelo ID e calcula o quanto já foi pago e o saldo.

    `travar=True` bloqueia a linha do pedido até o fim da transação, para que
    dois pagamentos simultâneos não paguem o mesmo saldo duas vezes.
    """
    filtro = "AND p.data_abertura = :dt" if data_abertura is not None else ""
    trava = "FOR UPDATE OF p" if travar else ""
    params: dict = {"pid": pedido_id}
    if data_abertura is not None:
        params["dt"] = data_abertura

    r = await db.execute(text(f"""
        SELECT p.pedido_id, p.data_abertura, m.numero AS mesa_numero,
               cl.nome AS cliente_nome, p.status, p.valor_total,
               (SELECT COUNT(*) FROM crm.itens_pedido i
                 WHERE i.pedido_id = p.pedido_id
                   AND i.pedido_data_abertura = p.data_abertura) AS qtd_itens,
               COALESCE((SELECT SUM(g.valor) FROM fi.pagamentos g
                          WHERE g.pedido_id = p.pedido_id
                            AND g.pedido_data_abertura = p.data_abertura
                            AND g.status = 'confirmado'), 0) AS total_pago
        FROM crm.pedidos p
        LEFT JOIN crm.mesas m ON m.mesa_id = p.mesa_id
        LEFT JOIN crm.clientes cl ON cl.cliente_id = p.cliente_id
        WHERE p.pedido_id = :pid {filtro}
        {trava}
    """), params)
    linha = r.mappings().first()
    if linha is None:
        return None
    dados = dict(linha)
    dados["saldo"] = dados["valor_total"] - dados["total_pago"]
    return dados


@router.get("/pedidos/{pedido_id}/resumo", response_model=PedidoPagamentoResumo)
async def resumo_pedido_pagamento(
    pedido_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_PAGAMENTO)),
):
    """Mostra o pedido, o total, o que já foi pago e o saldo a pagar."""
    resumo = await _resumo_pedido(db, pedido_id)
    if resumo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido não encontrado")
    return resumo


@router.post("/pagamentos", response_model=PagamentoRegistrado, status_code=201)
async def registrar_pagamento(
    p: PagamentoIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_PAGAMENTO)),
):
    resumo = await _resumo_pedido(
        db, p.pedido_id, p.pedido_data_abertura, travar=True
    )
    if resumo is None:
        await db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido não encontrado")
    if resumo["status"] == "cancelado":
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Pedido cancelado: não aceita pagamento"
        )
    if resumo["valor_total"] <= 0:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Pedido sem valor: adicione itens antes de pagar"
        )

    saldo = resumo["saldo"]
    if saldo <= 0:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Este pedido já está quitado")

    # Sem valor informado, paga o saldo inteiro do pedido.
    valor = saldo if p.valor is None else Decimal(str(p.valor))

    pagamento_id = (await db.execute(text("""
        INSERT INTO fi.pagamentos (pedido_id, pedido_data_abertura, forma_pagamento, valor)
        VALUES (:pedido_id, :data_abertura, :forma, :valor)
        RETURNING pagamento_id
    """), {
        "pedido_id": resumo["pedido_id"],
        "data_abertura": resumo["data_abertura"],
        "forma": p.forma_pagamento,
        "valor": valor,
    })).scalar()
    await db.commit()

    restante = saldo - valor
    return PagamentoRegistrado(
        status=(
            f"Pagamento de R$ {valor:.2f} registrado no pedido #{resumo['pedido_id']}."
            + (" Pedido quitado." if restante <= 0 else f" Saldo restante: R$ {restante:.2f}.")
        ),
        pagamento_id=pagamento_id,
        pedido_id=resumo["pedido_id"],
        valor=float(valor),
        saldo_restante=float(max(restante, Decimal(0))),
        quitado=restante <= 0,
    )


# ---------------------------------------------------------------------------
# Contas a pagar
# ---------------------------------------------------------------------------

@router.get("/contas-pagar", response_model=list[ContaPagarOut])
async def listar_contas_pagar(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_FIN_LEITURA)),
):
    r = await db.execute(text("""
        SELECT cp.cp_id, cp.fornecedor_id, f.razao_social AS fornecedor_nome,
               cp.compra_id, cp.descricao, cp.valor, cp.vencimento, cp.pago_em,
               cp.status
        FROM fi.contas_pagar cp
        LEFT JOIN mm.fornecedores f ON f.fornecedor_id = cp.fornecedor_id
        ORDER BY cp.status = 'paga', cp.vencimento
    """))
    return r.mappings().all()


@router.post("/contas-pagar", response_model=ContaPagarOut, status_code=201)
async def criar_conta_pagar(
    dados: ContaPagarCriar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_FIN)),
):
    if dados.fornecedor_id is not None:
        existe = (await db.execute(
            text("SELECT 1 FROM mm.fornecedores WHERE fornecedor_id = :id"),
            {"id": dados.fornecedor_id},
        )).scalar()
        if not existe:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Fornecedor não encontrado")

    cp_id = (await db.execute(text("""
        INSERT INTO fi.contas_pagar (descricao, valor, vencimento, fornecedor_id)
        VALUES (:descricao, :valor, :vencimento, :fornecedor_id)
        RETURNING cp_id
    """), dados.model_dump())).scalar()
    await db.commit()
    return await _buscar_conta_pagar(db, cp_id)


@router.patch("/contas-pagar/{cp_id}/pagar", response_model=ContaPagarOut)
async def pagar_conta(
    cp_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_FIN)),
):
    r = await db.execute(text("""
        UPDATE fi.contas_pagar
        SET status = 'paga', pago_em = CURRENT_DATE
        WHERE cp_id = :id AND status <> 'cancelada'
        RETURNING cp_id
    """), {"id": cp_id})
    if r.first() is None:
        await db.rollback()
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Conta não encontrada ou já cancelada",
        )
    await db.commit()
    return await _buscar_conta_pagar(db, cp_id)


async def _buscar_conta_pagar(db: AsyncSession, cp_id: int):
    r = await db.execute(text("""
        SELECT cp.cp_id, cp.fornecedor_id, f.razao_social AS fornecedor_nome,
               cp.compra_id, cp.descricao, cp.valor, cp.vencimento, cp.pago_em,
               cp.status
        FROM fi.contas_pagar cp
        LEFT JOIN mm.fornecedores f ON f.fornecedor_id = cp.fornecedor_id
        WHERE cp.cp_id = :id
    """), {"id": cp_id})
    return r.mappings().first()


# ---------------------------------------------------------------------------
# Contas a receber
# ---------------------------------------------------------------------------

@router.get("/contas-receber", response_model=list[ContaReceberOut])
async def listar_contas_receber(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_FIN_LEITURA)),
):
    r = await db.execute(text("""
        SELECT cr.cr_id, cr.cliente_id, cl.nome AS cliente_nome,
               cr.descricao, cr.valor, cr.vencimento, cr.recebido_em, cr.status
        FROM fi.contas_receber cr
        LEFT JOIN crm.clientes cl ON cl.cliente_id = cr.cliente_id
        ORDER BY cr.status = 'recebida', cr.vencimento
    """))
    return r.mappings().all()


@router.post("/contas-receber", response_model=ContaReceberOut, status_code=201)
async def criar_conta_receber(
    dados: ContaReceberCriar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_FIN)),
):
    if dados.cliente_id is not None:
        existe = (await db.execute(
            text("SELECT 1 FROM crm.clientes WHERE cliente_id = :id"),
            {"id": dados.cliente_id},
        )).scalar()
        if not existe:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")

    cr_id = (await db.execute(text("""
        INSERT INTO fi.contas_receber (descricao, valor, vencimento, cliente_id)
        VALUES (:descricao, :valor, :vencimento, :cliente_id)
        RETURNING cr_id
    """), dados.model_dump())).scalar()
    await db.commit()
    return await _buscar_conta_receber(db, cr_id)


@router.patch("/contas-receber/{cr_id}/receber", response_model=ContaReceberOut)
async def receber_conta(
    cr_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_FIN)),
):
    r = await db.execute(text("""
        UPDATE fi.contas_receber
        SET status = 'recebida', recebido_em = CURRENT_DATE
        WHERE cr_id = :id AND status <> 'cancelada'
        RETURNING cr_id
    """), {"id": cr_id})
    if r.first() is None:
        await db.rollback()
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Conta não encontrada ou já cancelada",
        )
    await db.commit()
    return await _buscar_conta_receber(db, cr_id)


async def _buscar_conta_receber(db: AsyncSession, cr_id: int):
    r = await db.execute(text("""
        SELECT cr.cr_id, cr.cliente_id, cl.nome AS cliente_nome,
               cr.descricao, cr.valor, cr.vencimento, cr.recebido_em, cr.status
        FROM fi.contas_receber cr
        LEFT JOIN crm.clientes cl ON cl.cliente_id = cr.cliente_id
        WHERE cr.cr_id = :id
    """), {"id": cr_id})
    return r.mappings().first()


# ---------------------------------------------------------------------------
# Fluxo de caixa (view)
# ---------------------------------------------------------------------------

@router.get("/fluxo-caixa", response_model=list[FluxoCaixaLinha])
async def fluxo_caixa(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_FIN_LEITURA)),
):
    r = await db.execute(text("""
        SELECT data, situacao, saldo_dia, acumulado
        FROM fi.vw_fluxo_caixa
        ORDER BY data
    """))
    return r.mappings().all()


# ---------------------------------------------------------------------------
# Fechamento de caixa (procedure com COMMIT interno)
# ---------------------------------------------------------------------------

@router.get("/fechamentos", response_model=list[FechamentoCaixaOut])
async def listar_fechamentos(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_FIN_LEITURA)),
):
    r = await db.execute(text("""
        SELECT fechamento_id, data_referencia, total_vendas, total_dinheiro,
               total_cartao, total_pix, qtd_pedidos, executado_em
        FROM fi.fechamentos_caixa
        ORDER BY data_referencia DESC
    """))
    return r.mappings().all()


@router.post("/fechamentos", response_model=FechamentoCaixaOut, status_code=201)
async def fechar_caixa(
    dados: FecharCaixaIn,
    db: AsyncSession = Depends(get_db),
    funcionario_id: int = Depends(funcionario_do_usuario),
    _=Depends(exige_perfis(*PERFIS_FIN)),
):
    """Consolida os pagamentos do dia em fi.fechamentos_caixa.

    A procedure fi.fechar_caixa_diario faz COMMIT internamente, então precisa
    rodar fora de uma transação. Usamos uma conexão dedicada em AUTOCOMMIT.
    """
    data_ref = dados.data or date.today()
    try:
        autocommit = engine.execution_options(isolation_level="AUTOCOMMIT")
        async with autocommit.connect() as conn:
            await conn.execute(
                text("CALL fi.fechar_caixa_diario(:d, :f)"),
                {"d": data_ref, "f": funcionario_id},
            )
    except Exception as e:  # erro de banco vira 400 legível
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Falha ao fechar o caixa: {e}",
        )

    linha = (await db.execute(text("""
        SELECT fechamento_id, data_referencia, total_vendas, total_dinheiro,
               total_cartao, total_pix, qtd_pedidos, executado_em
        FROM fi.fechamentos_caixa WHERE data_referencia = :d
    """), {"d": data_ref})).mappings().first()
    if linha is None:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Fechamento não encontrado após execução",
        )
    return linha
