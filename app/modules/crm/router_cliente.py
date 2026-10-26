from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import exige_perfis, Perfil
from app.modules.crm.schemas_cliente import (
    ClienteOut,
    ClienteCriar,
    ClienteAtualizar,
    ResgatarPontosIn,
    FidelidadeResultado,
)

router = APIRouter(prefix="/crm/clientes", tags=["Clientes e Fidelidade"])

# Atendimento e gestão administram clientes.
PERFIS_CLIENTES = (Perfil.GARCOM, Perfil.GERENTE, Perfil.SUPERVISOR)


async def _buscar_cliente(db: AsyncSession, cliente_id: int):
    r = await db.execute(text("""
        SELECT cliente_id, nome, cpf, telefone, email, pontos_fidelidade,
               data_cadastro, ativo
        FROM crm.clientes WHERE cliente_id = :id
    """), {"id": cliente_id})
    return r.mappings().first()


@router.get("", response_model=list[ClienteOut])
async def listar_clientes(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_CLIENTES)),
):
    r = await db.execute(text("""
        SELECT cliente_id, nome, cpf, telefone, email, pontos_fidelidade,
               data_cadastro, ativo
        FROM crm.clientes ORDER BY nome
    """))
    return r.mappings().all()


@router.post("", response_model=ClienteOut, status_code=201)
async def criar_cliente(
    dados: ClienteCriar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_CLIENTES)),
):
    try:
        cliente_id = (await db.execute(text("""
            INSERT INTO crm.clientes (nome, cpf, telefone, email)
            VALUES (:nome, :cpf, :telefone, :email)
            RETURNING cliente_id
        """), {
            "nome": dados.nome,
            "cpf": dados.cpf,
            "telefone": dados.telefone,
            "email": dados.email,
        })).scalar()
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe um cliente com esse CPF")
    return await _buscar_cliente(db, cliente_id)


@router.patch("/{cliente_id}", response_model=ClienteOut)
async def atualizar_cliente(
    cliente_id: int,
    dados: ClienteAtualizar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_CLIENTES)),
):
    campos = dados.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nenhum campo para atualizar")

    set_sql = ", ".join(f"{c} = :{c}" for c in campos)
    r = await db.execute(
        text(f"UPDATE crm.clientes SET {set_sql} WHERE cliente_id = :id RETURNING cliente_id"),
        {**campos, "id": cliente_id},
    )
    if r.first() is None:
        await db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")
    await db.commit()
    return await _buscar_cliente(db, cliente_id)


# ---------------------------------------------------------------------------
# Fidelidade
# ---------------------------------------------------------------------------

@router.post("/{cliente_id}/resgatar-pontos", response_model=FidelidadeResultado)
async def resgatar_pontos(
    cliente_id: int,
    dados: ResgatarPontosIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_CLIENTES)),
):
    """Debita pontos do cliente (ex.: troca por sobremesa/desconto).

    O CHECK (pontos_fidelidade >= 0) do banco impede saldo negativo; aqui
    validamos antes para dar uma mensagem clara.
    """
    cliente = await _buscar_cliente(db, cliente_id)
    if cliente is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado")
    if cliente["pontos_fidelidade"] < dados.pontos:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Saldo insuficiente: cliente tem {cliente['pontos_fidelidade']} ponto(s)",
        )

    novo = (await db.execute(text("""
        UPDATE crm.clientes
        SET pontos_fidelidade = pontos_fidelidade - :p
        WHERE cliente_id = :id
        RETURNING pontos_fidelidade
    """), {"p": dados.pontos, "id": cliente_id})).scalar()
    await db.commit()

    return FidelidadeResultado(
        cliente_id=cliente_id,
        nome=cliente["nome"],
        pontos_fidelidade=novo,
        mensagem=f"{dados.pontos} ponto(s) resgatado(s): {dados.motivo}",
    )
