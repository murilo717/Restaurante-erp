from datetime import datetime, date
from typing import Literal
from pydantic import BaseModel, Field

# --- KDS (crm.itens_pedido.status_producao) ---
StatusProducao = Literal["fila", "preparando", "pronto", "entregue"]


class ItemKDS(BaseModel):
    item_id: int
    pedido_id: int
    mesa_numero: int | None
    canal: str
    prato_nome: str
    quantidade: int
    status_producao: StatusProducao
    pedido_status: str
    data_abertura: datetime


class StatusProducaoIn(BaseModel):
    status_producao: StatusProducao


# --- Ordens de Produção (pp.ordens_producao) ---
StatusOP = Literal["planejada", "em_andamento", "concluida", "cancelada"]


class CentroOut(BaseModel):
    centro_id: int
    nome: str
    capacidade_porcoes_hora: int


class OrdemProducaoOut(BaseModel):
    op_id: int
    prato_id: int
    prato_nome: str
    centro_id: int
    centro_nome: str
    quantidade: int
    status: StatusOP
    data_prevista: date
    iniciada_em: datetime | None
    concluida_em: datetime | None


class OrdemProducaoCriar(BaseModel):
    prato_id: int
    centro_id: int
    quantidade: int = Field(gt=0)
    data_prevista: date | None = None


class OrdemStatusIn(BaseModel):
    status: StatusOP


class CapacidadeCentroOut(BaseModel):
    centro_id: int
    centro: str
    data_prevista: date
    porcoes_planejadas: int
    capacidade_dia: float
    ocupacao_pct: float
