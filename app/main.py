from fastapi import FastAPI
from app.modules.auth.router import router as auth
from app.modules.crm.router import router as crm
from app.modules.fi.router import router as fi

app = FastAPI(title="ERP Restaurante - API")

app.include_router(auth)
app.include_router(crm)
app.include_router(fi)
# Adicione os próximos módulos conforme for criando (bi, rh, mm, etc.)