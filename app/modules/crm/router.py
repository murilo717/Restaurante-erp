from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import exige_perfis, Perfil

router = APIRouter(prefix="/crm", tags=["Vendas e Clientes"])

@router.get("/pratos")
async def listar_pratos(db: AsyncSession = Depends(get_db), 
                        _=Depends(exige_perfis(Perfil.GARCOM, Perfil.COZINHA, Perfil.GERENTE, Perfil.SUPERVISOR))):
    r = await db.execute(text("SELECT prato_id, nome, preco_atual FROM crm.pratos WHERE ativo ORDER BY nome"))
    return r.mappings().all()