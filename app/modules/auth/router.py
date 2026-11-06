from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import criar_token, exige_perfis, Perfil
from app.modules.auth.schemas import (
    CadastroIn,
    CadastroOut,
    AtribuirPerfisIn,
    UsuarioListaOut,
)

router = APIRouter(prefix="/auth", tags=["Autenticação"])

# Perfil atribuído a todo cadastro público. É o acesso mais básico;
# a elevação para perfis administrativos é feita por um gestor.
PERFIL_INICIAL = Perfil.GARCOM.value


async def _perfis_do_usuario(db: AsyncSession, login: str) -> list[str]:
    perfis = (await db.execute(text("""
        SELECT p.nome FROM sys.usuarios u
        JOIN sys.usuario_perfis up USING (usuario_id)
        JOIN sys.perfis p USING (perfil_id)
        WHERE u.login = :l
    """), {"l": login})).scalars().all()
    return list(perfis)


@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    # O banco verifica a senha e atualiza o ultimo_login
    ok = (await db.execute(text("SELECT sys.fn_autenticar(:l, :s)"),
                           {"l": form.username, "s": form.password})).scalar()
    await db.commit()  # Necessário pois fn_autenticar faz UPDATE

    if not ok:
        raise HTTPException(401, "Login ou senha inválidos")

    perfis = await _perfis_do_usuario(db, form.username)
    return {"access_token": criar_token(form.username, perfis), "token_type": "bearer"}


@router.post("/cadastro", response_model=CadastroOut, status_code=201)
async def cadastrar(dados: CadastroIn, db: AsyncSession = Depends(get_db)):
    """Cadastro público de usuário.

    Cria o usuário com senha protegida (bcrypt via sys.fn_criar_usuario) e
    atribui apenas o perfil inicial básico. Ninguém pode se cadastrar como
    administrador: a atribuição de perfis elevados é responsabilidade de um
    gestor, pela rota protegida /auth/usuarios/{id}/perfis.
    """
    # Impede login/email duplicados antes de tentar inserir.
    existe = (await db.execute(text("""
        SELECT 1 FROM sys.usuarios
        WHERE login = :login OR lower(email) = lower(:email)
        LIMIT 1
    """), {"login": dados.login, "email": dados.email})).scalar()
    if existe:
        raise HTTPException(status.HTTP_409_CONFLICT, "Login ou e-mail já cadastrado")

    try:
        # Cria o usuário; a função gera o hash bcrypt internamente.
        usuario_id = (await db.execute(
            text("""
                SELECT sys.fn_criar_usuario(
                    :login, :nome, :email, :senha, NULL
                )
            """),
            {
                "login": dados.login,
                "nome": dados.nome,
                "email": dados.email,
                "senha": dados.senha,
            },
        )).scalar()

        # Atribui o perfil inicial (busca o id pelo nome do perfil).
        await db.execute(text("""
            INSERT INTO sys.usuario_perfis (usuario_id, perfil_id)
            SELECT :uid, p.perfil_id FROM sys.perfis p WHERE p.nome = :perfil
        """), {"uid": usuario_id, "perfil": PERFIL_INICIAL})

        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Login ou e-mail já cadastrado")

    return CadastroOut(
        usuario_id=usuario_id,
        login=dados.login,
        nome=dados.nome,
        email=dados.email,
        perfis=[PERFIL_INICIAL],
        mensagem="Usuário cadastrado com sucesso. Faça login para acessar o sistema.",
    )


@router.post("/usuarios/{usuario_id}/perfis")
async def atribuir_perfis(
    usuario_id: int,
    dados: AtribuirPerfisIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(Perfil.DBA)),
):
    """Atribui perfis a um usuário. Restrito ao administrador (dba/ceo).

    Não é permitido a gerentes: senão qualquer gerente poderia conceder a si
    mesmo os perfis dba ou ceo (escalada de privilégio).
    """
    perfis_pedidos = {p.strip().lower() for p in dados.perfis}

    # Confirma que o usuário existe.
    alvo = (await db.execute(
        text("SELECT 1 FROM sys.usuarios WHERE usuario_id = :uid"),
        {"uid": usuario_id},
    )).scalar()
    if not alvo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")

    # Valida que todos os perfis pedidos existem em sys.perfis.
    validos = set((await db.execute(
        text("SELECT nome FROM sys.perfis WHERE nome = ANY(:nomes)"),
        {"nomes": list(perfis_pedidos)},
    )).scalars().all())
    invalidos = perfis_pedidos - validos
    if invalidos:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Perfis inexistentes: {', '.join(sorted(invalidos))}",
        )

    # Insere os vínculos ignorando os que já existem.
    await db.execute(text("""
        INSERT INTO sys.usuario_perfis (usuario_id, perfil_id)
        SELECT :uid, p.perfil_id FROM sys.perfis p WHERE p.nome = ANY(:nomes)
        ON CONFLICT DO NOTHING
    """), {"uid": usuario_id, "nomes": list(perfis_pedidos)})
    await db.commit()

    return {"usuario_id": usuario_id, "perfis": sorted(validos)}


@router.get("/usuarios", response_model=list[UsuarioListaOut])
async def listar_usuarios(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(Perfil.DBA)),
):
    """Lista todos os usuários com seus perfis (administrador)."""
    r = await db.execute(text("""
        SELECT u.usuario_id, u.login, u.nome, u.email, u.ativo, u.funcionario_id,
               COALESCE(
                   array_agg(p.nome ORDER BY p.nome) FILTER (WHERE p.nome IS NOT NULL),
                   ARRAY[]::varchar[]
               ) AS perfis
        FROM sys.usuarios u
        LEFT JOIN sys.usuario_perfis up ON up.usuario_id = u.usuario_id
        LEFT JOIN sys.perfis p ON p.perfil_id = up.perfil_id
        GROUP BY u.usuario_id, u.login, u.nome, u.email, u.ativo, u.funcionario_id
        ORDER BY u.login
    """))
    return r.mappings().all()


@router.delete("/usuarios/{usuario_id}/perfis/{perfil}")
async def remover_perfil(
    usuario_id: int,
    perfil: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(exige_perfis(Perfil.DBA)),
):
    """Remove um perfil de um usuário (administrador).

    Protege contra bloqueio: o administrador não pode tirar o próprio perfil
    dba, senão ninguém mais conseguiria gerenciar permissões.
    """
    perfil = perfil.strip().lower()

    alvo_login = (await db.execute(
        text("SELECT login FROM sys.usuarios WHERE usuario_id = :uid"),
        {"uid": usuario_id},
    )).scalar()
    if alvo_login is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")

    if alvo_login == admin["login"] and perfil == Perfil.DBA.value:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Você não pode remover o seu próprio perfil dba",
        )

    r = await db.execute(text("""
        DELETE FROM sys.usuario_perfis
        WHERE usuario_id = :uid
          AND perfil_id = (SELECT perfil_id FROM sys.perfis WHERE nome = :perfil)
    """), {"uid": usuario_id, "perfil": perfil})
    if r.rowcount == 0:
        await db.rollback()
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "O usuário não possui esse perfil"
        )
    await db.commit()

    perfis = await _perfis_do_usuario(db, alvo_login)
    return {"usuario_id": usuario_id, "perfis": sorted(perfis)}
