from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import usuario_atual, exige_perfis, Perfil
from app.modules.rh.schemas import (
    FuncionarioOut,
    FuncionarioCriar,
    VincularUsuarioIn,
)

router = APIRouter(prefix="/rh", tags=["Recursos Humanos"])

# Apenas gestores administram funcionários e vínculos de acesso.
PERFIS_GESTAO = (Perfil.GERENTE,)


@router.get("/status")
async def status_rh(
    db: AsyncSession = Depends(get_db),
    _usuario: dict = Depends(usuario_atual),
):
    await db.execute(text("SELECT 1"))
    return {"modulo": "rh", "status": "disponivel"}


@router.get("/funcionarios", response_model=list[FuncionarioOut])
async def listar_funcionarios(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    r = await db.execute(text("""
        SELECT f.funcionario_id, f.nome, f.cpf, f.cargo, f.salario,
               f.data_admissao, f.ativo, u.login AS usuario_login
        FROM rh.funcionarios f
        LEFT JOIN sys.usuarios u ON u.funcionario_id = f.funcionario_id
        ORDER BY f.nome
    """))
    return r.mappings().all()


@router.post("/funcionarios", response_model=FuncionarioOut, status_code=201)
async def criar_funcionario(
    dados: FuncionarioCriar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    try:
        r = await db.execute(text("""
            INSERT INTO rh.funcionarios (nome, cpf, cargo, salario)
            VALUES (:nome, :cpf, :cargo, :salario)
            RETURNING funcionario_id, nome, cpf, cargo, salario,
                      data_admissao, ativo
        """), dados.model_dump())
        linha = dict(r.mappings().one())
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Já existe um funcionário com esse CPF",
        )
    linha["usuario_login"] = None
    return linha


@router.post("/funcionarios/{funcionario_id}/vincular-usuario")
async def vincular_usuario(
    funcionario_id: int,
    dados: VincularUsuarioIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    """Associa o login de um usuário a este funcionário.

    Depois disso, quando esse usuário abrir um pedido, ele será registrado
    sob este funcionário.
    """
    # Funcionário existe?
    func = (await db.execute(
        text("SELECT nome FROM rh.funcionarios WHERE funcionario_id = :id"),
        {"id": funcionario_id},
    )).scalar()
    if func is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Funcionário não encontrado")

    # Usuário existe?
    usuario_id = (await db.execute(
        text("SELECT usuario_id FROM sys.usuarios WHERE login = :l"),
        {"l": dados.login},
    )).scalar()
    if usuario_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")

    # Esse funcionário já está vinculado a outro usuário?
    outro = (await db.execute(
        text("""
            SELECT login FROM sys.usuarios
            WHERE funcionario_id = :fid AND usuario_id <> :uid
        """),
        {"fid": funcionario_id, "uid": usuario_id},
    )).scalar()
    if outro is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Este funcionário já está vinculado ao usuário '{outro}'",
        )

    await db.execute(text("""
        UPDATE sys.usuarios SET funcionario_id = :fid WHERE usuario_id = :uid
    """), {"fid": funcionario_id, "uid": usuario_id})
    await db.commit()

    return {
        "funcionario_id": funcionario_id,
        "funcionario_nome": func,
        "usuario_login": dados.login,
        "mensagem": "Usuário vinculado ao funcionário com sucesso.",
    }
