from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field

StatusContaPagar = Literal["aberta", "paga", "atrasada", "cancelada"]
StatusContaReceber = Literal["aberta", "recebida", "atrasada", "cancelada"]


# --- Contas a pagar ---
class ContaPagarOut(BaseModel):
    cp_id: int
    fornecedor_id: int | None
    fornecedor_nome: str | None
    compra_id: int | None
    descricao: str
    valor: float
    vencimento: date
    pago_em: date | None
    status: StatusContaPagar


class ContaPagarCriar(BaseModel):
    descricao: str = Field(min_length=2, max_length=200)
    valor: float = Field(gt=0)
    vencimento: date
    fornecedor_id: int | None = None


# --- Contas a receber ---
class ContaReceberOut(BaseModel):
    cr_id: int
    cliente_id: int | None
    cliente_nome: str | None
    descricao: str
    valor: float
    vencimento: date
    recebido_em: date | None
    status: StatusContaReceber


class ContaReceberCriar(BaseModel):
    descricao: str = Field(min_length=2, max_length=200)
    valor: float = Field(gt=0)
    vencimento: date
    cliente_id: int | None = None


# --- Fluxo de caixa ---
class FluxoCaixaLinha(BaseModel):
    data: date
    situacao: str
    saldo_dia: float
    acumulado: float


# --- Fechamento de caixa ---
class FechamentoCaixaOut(BaseModel):
    fechamento_id: int
    data_referencia: date
    total_vendas: float
    total_dinheiro: float
    total_cartao: float
    total_pix: float
    qtd_pedidos: int
    executado_em: datetime


class FecharCaixaIn(BaseModel):
    data: date | None = None
