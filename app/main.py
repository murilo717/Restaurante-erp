from fastapi import FastAPI
from app.modules.auth.router import router as auth
from app.modules.bi.router import router as bi
from app.modules.crm.router import router as crm
from app.modules.fi.router import router as fi
from app.modules.mm.router import router as mm
from app.modules.pp.router import router as pp
from app.modules.rh.router import router as rh

app = FastAPI(title="ERP Restaurante - API")

app.include_router(auth)
app.include_router(bi)
app.include_router(crm)
app.include_router(fi)
app.include_router(mm)
app.include_router(pp)
app.include_router(rh)