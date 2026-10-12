from typing import Literal
from pydantic import BaseModel, Field

# Valores aceitos pela constraint crm.mesas_status_check
StatusMesa = Literal["livre", "ocupada", "reservada", "manutencao"]


class MesaOut(BaseModel):
    mesa_id: int
    numero: int
    capacidade: int
    status: StatusMesa


class MesaCriar(BaseModel):
    numero: int = Field(gt=0)
    capacidade: int = Field(gt=0)
    status: StatusMesa = "livre"


class MesaAtualizar(BaseModel):
    """Atualização parcial de uma mesa. Todos os campos são opcionais."""

    numero: int | None = Field(default=None, gt=0)
    capacidade: int | None = Field(default=None, gt=0)
    status: StatusMesa | None = None


class MesaStatusIn(BaseModel):
    status: StatusMesa
