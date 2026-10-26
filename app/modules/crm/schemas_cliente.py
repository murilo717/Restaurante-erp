from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


class ClienteOut(BaseModel):
    cliente_id: int
    nome: str
    cpf: str | None
    telefone: str | None
    email: str | None
    pontos_fidelidade: int
    data_cadastro: datetime
    ativo: bool


class ClienteCriar(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    cpf: str | None = Field(default=None)
    telefone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None

    @field_validator("cpf")
    @classmethod
    def cpf_valido(cls, v: str | None) -> str | None:
        if v is None or v.strip() == "":
            return None
        v = "".join(ch for ch in v if ch.isdigit())
        if len(v) != 11:
            raise ValueError("O CPF deve conter 11 dígitos")
        return v


class ClienteAtualizar(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=120)
    telefone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    ativo: bool | None = None


class ResgatarPontosIn(BaseModel):
    pontos: int = Field(gt=0)
    motivo: str = Field(default="Resgate de pontos", max_length=200)


class FidelidadeResultado(BaseModel):
    cliente_id: int
    nome: str
    pontos_fidelidade: int
    mensagem: str
