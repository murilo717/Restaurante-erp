from pydantic import BaseModel, EmailStr, Field, field_validator


class CadastroIn(BaseModel):
    """Dados do cadastro público de um novo usuário.

    O perfil NÃO é escolhido aqui: todo cadastro público recebe o perfil
    inicial mais básico. A elevação de perfil é feita por um administrador.
    """

    nome: str = Field(min_length=3, max_length=120)
    email: EmailStr
    login: str = Field(min_length=3, max_length=60)
    senha: str = Field(min_length=8, max_length=128)
    confirmar_senha: str = Field(min_length=8, max_length=128)
    telefone: str | None = Field(default=None, max_length=20)

    @field_validator("login")
    @classmethod
    def login_sem_espacos(cls, v: str) -> str:
        v = v.strip()
        if " " in v:
            raise ValueError("O login não pode conter espaços")
        return v

    @field_validator("confirmar_senha")
    @classmethod
    def senhas_conferem(cls, v: str, info) -> str:
        senha = info.data.get("senha")
        if senha is not None and v != senha:
            raise ValueError("As senhas não conferem")
        return v


class CadastroOut(BaseModel):
    usuario_id: int
    login: str
    nome: str
    email: EmailStr
    perfis: list[str]
    mensagem: str


class AtribuirPerfisIn(BaseModel):
    """Perfis que um administrador atribui a um usuário existente."""

    perfis: list[str] = Field(min_length=1)
