from datetime import datetime, timedelta, timezone
from enum import StrEnum
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")

class Perfil(StrEnum):
    GARCOM = "garcom"
    COZINHA = "cozinha"
    SUPERVISOR = "supervisor"
    GERENTE = "gerente"
    AUDITOR = "auditor"
    CEO = "ceo"
    DBA = "dba"

SEMPRE_PERMITIDOS = {Perfil.CEO, Perfil.DBA}

def criar_token(login: str, perfis: list[str]) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_minutos)
    return jwt.encode({"sub": login, "perfis": perfis, "exp": exp}, settings.jwt_secret, algorithm="HS256")

def usuario_atual(token: str = Depends(oauth2)) -> dict:
    try:
        p = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido ou expirado")
    return {"login": p["sub"], "perfis": [x.lower() for x in p["perfis"]]}

def exige_perfis(*permitidos: Perfil):
    aceitos = {p.value for p in permitidos} | {p.value for p in SEMPRE_PERMITIDOS}
    def checker(user: dict = Depends(usuario_atual)) -> dict:
        if not aceitos & set(user["perfis"]):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Perfil sem permissão")
        return user
    return checker