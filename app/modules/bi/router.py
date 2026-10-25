from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import usuario_atual, exige_perfis, Perfil
from app.modules.bi.schemas import (
    DashboardExecutivo,
    PratoMaisVendido,
    VendaDiaria,
    EtapaFunil,
)

router = APIRouter(prefix="/bi", tags=["Business Intelligence"])

# Gestão e papéis analíticos enxergam os indicadores.
PERFIS_BI = (Perfil.GERENTE, Perfil.SUPERVISOR, Perfil.AUDITOR)


@router.get("/status")
async def status_bi(
    db: AsyncSession = Depends(get_db),
    _usuario: dict = Depends(usuario_atual),
):
    await db.execute(text("SELECT 1"))
    return {"modulo": "bi", "status": "disponivel"}


@router.get("/dashboard", response_model=DashboardExecutivo)
async def dashboard_executivo(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_BI)),
):
    r = await db.execute(text("""
        SELECT faturamento_mes, insumos_abaixo_minimo, os_abertas, ncs_abertas,
               riscos_criticos, manutencoes_vencidas, contas_pagar_vencidas
        FROM bi.vw_dashboard_executivo
    """))
    linha = r.mappings().first()
    if linha is None:
        # View sem linha (sem dados): devolve zeros.
        return DashboardExecutivo(
            faturamento_mes=0, insumos_abaixo_minimo=0, os_abertas=0,
            ncs_abertas=0, riscos_criticos=0, manutencoes_vencidas=0,
            contas_pagar_vencidas=0,
        )
    return linha


@router.get("/pratos-mais-vendidos", response_model=list[PratoMaisVendido])
async def pratos_mais_vendidos(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_BI)),
):
    r = await db.execute(text("""
        SELECT mes_referencia, prato_id, prato, categoria,
               quantidade_vendida, receita_total
        FROM bi.vw_pratos_mais_vendidos_mes
        ORDER BY mes_referencia DESC, quantidade_vendida DESC
        LIMIT 20
    """))
    return r.mappings().all()


@router.get("/vendas-diarias", response_model=list[VendaDiaria])
async def vendas_diarias(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_BI)),
):
    r = await db.execute(text("""
        SELECT dia, prato_id, quantidade
        FROM bi.vw_vendas_diarias_prato
        ORDER BY dia
    """))
    return r.mappings().all()


@router.get("/funil-vendas", response_model=list[EtapaFunil])
async def funil_vendas(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_BI)),
):
    r = await db.execute(text("""
        SELECT etapa, qtd, valor_total, valor_ponderado
        FROM bi.vw_funil_vendas
        ORDER BY valor_total DESC
    """))
    return r.mappings().all()
