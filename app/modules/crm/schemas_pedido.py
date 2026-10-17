from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

# Valores aceitos pelas constraints de crm.pedidos
StatusPedido = Literal[
    "aberto", "em_preparo", "entregue", "pago", "cancelado"
]
CanalPedido = Literal["salao", "delivery", "qrcode"]


class PedidoAbrir(BaseModel):
    """Abertura de um pedido pelo garçom."""

    mesa_id: int | None = None
    canal: CanalPedido = "salao"


class ItemAdicionar(BaseModel):
    prato_id: int
    quantidade: int = Field(gt=0)


class ItemOut(BaseModel):
    item_id: int
    prato_id: int
    prato_nome: str
    quantidade: int
    preco_unitario_registrado: float
    subtotal: float
    status_producao: str


class PedidoResumo(BaseModel):
    pedido_id: int
    data_abertura: datetime
    mesa_id: int | None
    mesa_numero: int | None
    canal: CanalPedido
    status: StatusPedido
    valor_total: float
    qtd_itens: int


class PedidoDetalhe(BaseModel):
    pedido_id: int
    data_abertura: datetime
    mesa_id: int | None
    mesa_numero: int | None
    canal: CanalPedido
    status: StatusPedido
    valor_total: float
    itens: list[ItemOut]


class StatusPedidoIn(BaseModel):
    status: StatusPedido
