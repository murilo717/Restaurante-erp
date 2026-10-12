from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import exige_perfis, Perfil
from app.modules.crm.schemas import (
    MesaOut,
    MesaCriar,
    MesaAtualizar,
    MesaStatusIn,
)

router = APIRouter(prefix="/crm", tags=["Vendas e Clientes"])

# Perfis que operam o salão (leem mesas e pratos).
PERFIS_OPERACAO = (
    Perfil.GARCOM,
    Perfil.COZINHA,
    Perfil.GERENTE,
    Perfil.SUPERVISOR,
)
# Perfis que gerenciam a estrutura do salão (criam/editam mesas).
PERFIS_GESTAO = (Perfil.GERENTE, Perfil.SUPERVISOR)


@router.get("/pratos")
async def listar_pratos(db: AsyncSession = Depends(get_db),
                        _=Depends(exige_perfis(*PERFIS_OPERACAO))):
    r = await db.execute(text("SELECT prato_id, nome, preco_atual FROM crm.pratos WHERE ativo ORDER BY nome"))
    return r.mappings().all()


# ---------------------------------------------------------------------------
# Mesas (crm.mesas)
# ---------------------------------------------------------------------------

@router.get("/mesas", response_model=list[MesaOut])
async def listar_mesas(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_OPERACAO)),
):
    r = await db.execute(text("""
        SELECT mesa_id, numero, capacidade, status
        FROM crm.mesas
        ORDER BY numero
    """))
    return r.mappings().all()


@router.post("/mesas", response_model=MesaOut, status_code=201)
async def criar_mesa(
    dados: MesaCriar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    try:
        r = await db.execute(text("""
            INSERT INTO crm.mesas (numero, capacidade, status)
            VALUES (:numero, :capacidade, :status)
            RETURNING mesa_id, numero, capacidade, status
        """), dados.model_dump())
        linha = r.mappings().one()
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Já existe uma mesa com o número {dados.numero}",
        )
    return linha


@router.patch("/mesas/{mesa_id}", response_model=MesaOut)
async def atualizar_mesa(
    mesa_id: int,
    dados: MesaAtualizar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    campos = dados.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Nenhum campo para atualizar"
        )

    set_sql = ", ".join(f"{c} = :{c}" for c in campos)
    params = {**campos, "mesa_id": mesa_id}
    try:
        r = await db.execute(
            text(f"""
                UPDATE crm.mesas SET {set_sql}
                WHERE mesa_id = :mesa_id
                RETURNING mesa_id, numero, capacidade, status
            """),
            params,
        )
        linha = r.mappings().first()
        if not linha:
            await db.rollback()
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Mesa não encontrada")
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Já existe uma mesa com esse número"
        )
    return linha


@router.patch("/mesas/{mesa_id}/status", response_model=MesaOut)
async def alterar_status_mesa(
    mesa_id: int,
    dados: MesaStatusIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_OPERACAO)),
):
    """Altera apenas o status da mesa. Disponível à operação do salão."""
    r = await db.execute(text("""
        UPDATE crm.mesas SET status = :status
        WHERE mesa_id = :mesa_id
        RETURNING mesa_id, numero, capacidade, status
    """), {"status": dados.status, "mesa_id": mesa_id})
    linha = r.mappings().first()
    if not linha:
        await db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mesa não encontrada")
    await db.commit()
    return linha
