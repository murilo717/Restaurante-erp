from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal
from app.core.database import get_db
from app.core.security import exige_perfis, Perfil

router = APIRouter(prefix="/financeiro", tags=["Gestão Financeira"])

class PagamentoIn(BaseModel):
    pedido_id: int
    pedido_data_abertura: datetime
    forma_pagamento: Literal["dinheiro", "debito", "credito", "pix", "ifood"]
    valor: float = Field(ge=0)

@router.post("/pagamentos", status_code=201)
async def registrar_pagamento(p: PagamentoIn, db: AsyncSession = Depends(get_db), 
                              _=Depends(exige_perfis(Perfil.GARCOM, Perfil.GERENTE))):
    await db.execute(text("""
        INSERT INTO fi.pagamentos (pedido_id, pedido_data_abertura, forma_pagamento, valor)
        VALUES (:pedido_id, :pedido_data_abertura, :forma_pagamento, :valor)
    """), p.model_dump())
    await db.commit()
    return {"status": "pagamento registrado; estoque baixado pelas triggers do banco"}