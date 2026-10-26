import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { obterFluxoCaixa } from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import { formatarMoeda } from "@/utils/format";

export default function FluxoCaixaTab() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["fluxo-caixa"],
    queryFn: obterFluxoCaixa,
  });

  if (isLoading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  if (isError) return <Alert severity="error">{extrairMensagemErro(error)}</Alert>;

  const serie = (data ?? []).map((l) => ({
    data: l.data,
    acumulado: l.acumulado,
    saldo_dia: l.saldo_dia,
  }));

  return (
    <Box>
      <Card elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Saldo acumulado (realizado × previsto)
          </Typography>
          {serie.length === 0 ? (
            <Typography color="text.secondary">
              Sem movimentações registradas.
            </Typography>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip
                  formatter={(v: number) => formatarMoeda(v)}
                />
                <ReferenceLine y={0} stroke="#999" />
                <Area
                  type="monotone"
                  dataKey="acumulado"
                  stroke="#0f766e"
                  fill="#0f766e33"
                  name="Acumulado"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Situação</TableCell>
              <TableCell align="right">Saldo do dia</TableCell>
              <TableCell align="right">Acumulado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((l, idx) => (
              <TableRow key={`${l.data}-${idx}`} hover>
                <TableCell>{l.data}</TableCell>
                <TableCell>
                  <Chip
                    label={l.situacao}
                    size="small"
                    color={l.situacao === "realizado" ? "success" : "info"}
                    sx={{ textTransform: "capitalize" }}
                  />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ color: l.saldo_dia < 0 ? "error.main" : "text.primary" }}
                >
                  {formatarMoeda(l.saldo_dia)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ color: l.acumulado < 0 ? "error.main" : "text.primary" }}
                >
                  {formatarMoeda(l.acumulado)}
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  Sem dados de fluxo de caixa.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
