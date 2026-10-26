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


from datetime import datetime


# --- Ponto eletrônico ---
class PontoOut(BaseModel):
    ponto_id: int
    funcionario_id: int
    funcionario_nome: str
    entrada: datetime
    saida: datetime | None


class BaterPontoIn(BaseModel):
    funcionario_id: int


# --- Folha de pagamento ---
class FolhaOut(BaseModel):
    folha_id: int
    funcionario_id: int
    funcionario_nome: str
    competencia: date
    salario_bruto: float
    desconto_inss: float
    desconto_irrf: float
    desconto_beneficios: float
    salario_liquido: float


class GerarFolhaIn(BaseModel):
    # Qualquer dia do mês; a procedure normaliza para o 1º dia.
    competencia: date | None = None


# --- Recrutamento: vagas e candidatos ---
StatusVaga = Literal["aberta", "preenchida", "cancelada"]
EtapaCandidato = Literal[
    "triagem", "entrevista", "proposta", "contratado", "reprovado"
]


class VagaOut(BaseModel):
    vaga_id: int
    cargo: str
    descricao: str | None
    status: StatusVaga
    aberta_em: date
    qtd_candidatos: int


class VagaCriar(BaseModel):
    cargo: CargoFuncionario
    descricao: str | None = Field(default=None, max_length=2000)


class VagaStatusIn(BaseModel):
    status: StatusVaga


class CandidatoOut(BaseModel):
    candidato_id: int
    vaga_id: int
    nome: str
    email: str | None
    etapa: EtapaCandidato
    criado_em: datetime


class CandidatoCriar(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: str | None = Field(default=None, max_length=120)


class CandidatoEtapaIn(BaseModel):
    etapa: EtapaCandidato
