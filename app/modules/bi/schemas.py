from datetime import date
from pydantic import BaseModel


class DashboardExecutivo(BaseModel):
    faturamento_mes: float
    insumos_abaixo_minimo: int
    os_abertas: int
    ncs_abertas: int
    riscos_criticos: int
    manutencoes_vencidas: int
    contas_pagar_vencidas: int


class PratoMaisVendido(BaseModel):
    mes_referencia: date
    prato_id: int
    prato: str
    categoria: str
    quantidade_vendida: int
    receita_total: float


class VendaDiaria(BaseModel):
    dia: date
    prato_id: int
    quantidade: int


class EtapaFunil(BaseModel):
    etapa: str
    qtd: int
    valor_total: float
    valor_ponderado: float
