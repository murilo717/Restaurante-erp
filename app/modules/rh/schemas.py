from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, field_validator

# Cargos aceitos pela constraint rh.funcionarios_cargo_check
CargoFuncionario = Literal["garcom", "cozinha", "gerente", "ceo", "dba"]


class FuncionarioOut(BaseModel):
    funcionario_id: int
    nome: str
    cpf: str
    cargo: CargoFuncionario
    salario: float
    data_admissao: date
    ativo: bool
    # login do usuário vinculado a este funcionário (se houver)
    usuario_login: str | None = None


class FuncionarioCriar(BaseModel):
    nome: str = Field(min_length=3, max_length=120)
    cpf: str = Field(min_length=11, max_length=11)
    cargo: CargoFuncionario
    salario: float = Field(ge=0)

    @field_validator("cpf")
    @classmethod
    def cpf_somente_digitos(cls, v: str) -> str:
        v = v.strip().replace(".", "").replace("-", "")
        if not v.isdigit() or len(v) != 11:
            raise ValueError("O CPF deve conter exatamente 11 dígitos")
        return v


class VincularUsuarioIn(BaseModel):
    """Associa um login de usuário a um funcionário."""

    login: str = Field(min_length=3)
