from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field, field_validator


# --- Insumos ---
class InsumoOut(BaseModel):
    insumo_id: int
    nome: str
    unidade_medida: str
    quantidade_estoque: float
    estoque_minimo: float
    data_validade: date | None
    perecivel: bool
    abaixo_minimo: bool


# --- Ficha Técnica (mm.ficha_tecnica) ---
class FichaItemOut(BaseModel):
    insumo_id: int
    insumo_nome: str
    unidade_medida: str
    quantidade_necessaria: float


class FichaTecnicaOut(BaseModel):
    prato_id: int
    prato_nome: str
    itens: list[FichaItemOut]


class FichaItemIn(BaseModel):
    insumo_id: int
    quantidade_necessaria: float = Field(gt=0)


# --- Fornecedores ---
class FornecedorOut(BaseModel):
    fornecedor_id: int
    razao_social: str
    cnpj: str
    contato: str | None
    ativo: bool


class FornecedorCriar(BaseModel):
    razao_social: str = Field(min_length=2, max_length=150)
    cnpj: str = Field(min_length=14, max_length=14)
    contato: str | None = Field(default=None, max_length=120)

    @field_validator("cnpj")
    @classmethod
    def cnpj_digitos(cls, v: str) -> str:
        v = "".join(ch for ch in v if ch.isdigit())
        if len(v) != 14:
            raise ValueError("O CNPJ deve conter 14 dígitos")
        return v


# --- Compras (mm.pedidos_compra + itens_compra) ---
StatusCompra = Literal["rascunho", "enviado", "recebido", "cancelado"]


class ItemCompraIn(BaseModel):
    insumo_id: int
    quantidade: float = Field(gt=0)
    preco_unitario: float = Field(ge=0)
    validade: date | None = None


class ItemCompraOut(BaseModel):
    item_compra_id: int
    insumo_id: int
    insumo_nome: str
    quantidade: float
    preco_unitario: float
    validade: date | None


class CompraCriar(BaseModel):
    fornecedor_id: int


class CompraOut(BaseModel):
    compra_id: int
    fornecedor_id: int
    fornecedor_nome: str
    status: StatusCompra
    criado_em: datetime
    recebido_em: datetime | None
    valor_total: float
    itens: list[ItemCompraOut]


# --- Lotes ---
StatusLote = Literal["em_inspecao", "liberado", "bloqueado"]


class LoteOut(BaseModel):
    lote_id: int
    insumo_id: int
    insumo_nome: str
    codigo_lote: str
    quantidade_inicial: float
    validade: date | None
    status: StatusLote


class LoteStatusIn(BaseModel):
    status: StatusLote
