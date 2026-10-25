import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import PaidIcon from "@mui/icons-material/Paid";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ReceiptIcon from "@mui/icons-material/Receipt";
import BuildIcon from "@mui/icons-material/Build";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  obterDashboard,
  obterPratosMaisVendidos,
  obterVendasDiarias,
  statusModulo,
} from "@/api/services";
import { useAuth } from "@/auth/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { formatarMoeda } from "@/utils/format";

const MODULOS = [
  { id: "bi", nome: "Business Intelligence" },
  { id: "mm", nome: "Gestão de Materiais" },
  { id: "pp", nome: "Produção" },
  { id: "rh", nome: "Recursos Humanos" },
];

function CardIndicador({
  titulo,
  valor,
  icone,
  cor,
  alerta,
}: {
  titulo: string;
  valor: string;
  icone: React.ReactNode;
  cor: string;
  alerta?: boolean;
}) {
  return (
    <Card elevation={2} sx={{ borderLeft: 5, borderColor: cor }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="overline" color="text.secondary">
              {titulo}
            </Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              color={alerta ? "error.main" : "text.primary"}
            >
              {valor}
            </Typography>
          </Box>
          <Box sx={{ color: cor }}>{icone}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { usuario, temPerfil } = useAuth();
  const podeBI = temPerfil("gerente", "supervisor", "auditor");

  const resultados = useQueries({
    queries: MODULOS.map((m) => ({
      queryKey: ["status", m.id],
      queryFn: () => statusModulo(m.id),
    })),
  });

  const dashboard = useQuery({
    queryKey: ["bi-dashboard"],
    queryFn: obterDashboard,
    enabled: podeBI,
  });
  const maisVendidos = useQuery({
    queryKey: ["bi-mais-vendidos"],
    queryFn: obterPratosMaisVendidos,
    enabled: podeBI,
  });
  const vendasDiarias = useQuery({
    queryKey: ["bi-vendas-diarias"],
    queryFn: obterVendasDiarias,
    enabled: podeBI,
  });

  // Agrega vendas diárias por dia (soma de todas as quantidades de pratos).
  const serieVendas = (() => {
    const mapa = new Map<string, number>();
    for (const v of vendasDiarias.data ?? []) {
      mapa.set(v.dia, (mapa.get(v.dia) ?? 0) + v.quantidade);
    }
    return Array.from(mapa.entries())
      .map(([dia, quantidade]) => ({ dia, quantidade }))
      .sort((a, b) => a.dia.localeCompare(b.dia));
  })();

  const topPratos = (maisVendidos.data ?? []).slice(0, 8).map((p) => ({
    prato: p.prato,
    quantidade: p.quantidade_vendida,
    receita: p.receita_total,
  }));

  const d = dashboard.data;

  return (
    <Box>
      <PageHeader
        titulo={`Bem-vindo, ${usuario?.login ?? ""}`}
        descricao={
          podeBI
            ? "Indicadores do negócio e disponibilidade dos módulos."
            : "Visão geral do sistema e disponibilidade dos módulos."
        }
      />

      {/* Indicadores executivos — só para perfis de gestão/BI */}
      {podeBI && (
        <Box mb={4}>
          {dashboard.isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : dashboard.isError ? (
            <Alert severity="warning">
              Não foi possível carregar os indicadores.
            </Alert>
          ) : (
            d && (
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(4, 1fr)",
                  },
                  mb: 3,
                }}
              >
                <CardIndicador
                  titulo="Faturamento do mês"
                  valor={formatarMoeda(d.faturamento_mes)}
                  icone={<PaidIcon fontSize="large" />}
                  cor="#15803d"
                />
                <CardIndicador
                  titulo="Insumos abaixo do mínimo"
                  valor={String(d.insumos_abaixo_minimo)}
                  icone={<WarningAmberIcon fontSize="large" />}
                  cor="#c2410c"
                  alerta={d.insumos_abaixo_minimo > 0}
                />
                <CardIndicador
                  titulo="Contas a pagar vencidas"
                  valor={String(d.contas_pagar_vencidas)}
                  icone={<ReceiptIcon fontSize="large" />}
                  cor="#b91c1c"
                  alerta={d.contas_pagar_vencidas > 0}
                />
                <CardIndicador
                  titulo="Manutenções vencidas"
                  valor={String(d.manutencoes_vencidas)}
                  icone={<BuildIcon fontSize="large" />}
                  cor="#0f766e"
                  alerta={d.manutencoes_vencidas > 0}
                />
              </Box>
            )
          )}

          {/* Gráficos */}
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            }}
          >
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Vendas por dia (unidades)
                </Typography>
                {serieVendas.length === 0 ? (
                  <Typography color="text.secondary">
                    Sem vendas registradas ainda.
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={serieVendas}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="quantidade"
                        stroke="#c2410c"
                        strokeWidth={2}
                        name="Unidades vendidas"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Pratos mais vendidos (mês)
                </Typography>
                {topPratos.length === 0 ? (
                  <Typography color="text.secondary">
                    Sem dados de vendas no mês.
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={topPratos}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="prato"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="quantidade"
                        fill="#0f766e"
                        name="Qtd vendida"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Status dos módulos — para todos */}
      <Typography variant="h6" fontWeight={700} mb={1.5}>
        Disponibilidade dos módulos
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
        }}
      >
        {MODULOS.map((m, i) => {
          const q = resultados[i];
          const online = q.data?.status === "disponivel";
          return (
            <Box key={m.id}>
              <Card elevation={1}>
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                  >
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        {m.id.toUpperCase()}
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {m.nome}
                      </Typography>
                    </Box>
                    {q.isLoading ? (
                      <Chip label="..." size="small" />
                    ) : online ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </Stack>
                  <Box mt={1.5}>
                    <Chip
                      size="small"
                      color={
                        online ? "success" : q.isLoading ? "default" : "error"
                      }
                      label={
                        q.isLoading
                          ? "Verificando"
                          : online
                            ? "Disponível"
                            : "Indisponível"
                      }
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
