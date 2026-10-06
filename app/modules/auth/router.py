from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import criar_token

router = APIRouter(prefix="/auth", tags=["Autenticação"])

@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    # O banco verifica a senha e atualiza o ultimo_login
    ok = (await db.execute(text("SELECT sys.fn_autenticar(:l, :s)"), 
                           {"l": form.username, "s": form.password})).scalar()
    await db.commit() # Necessário pois fn_autenticar faz UPDATE
    
    if not ok:
        raise HTTPException(401, "Login ou senha inválidos")
    
    # Busca perfis do usuário
    perfis = (await db.execute(text("""
        SELECT p.nome FROM sys.usuarios u
        JOIN sys.usuario_perfis up USING (usuario_id)
        JOIN sys.perfis p USING (perfil_id)
        WHERE u.login = :l
    """), {"l": form.username})).scalars().all()
    
    return {"access_token": criar_token(form.username, list(perfis)), "token_type": "bearer"}