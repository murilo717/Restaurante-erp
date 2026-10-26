import { useState } from "react";
import {
  useMutation,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  baterEntrada,
  baterSaida,
  listarFuncionarios,
  listarPonto,
} from "@/api/services";
import { extrairMensagemErro } from "@/api/client";

function formatarDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

export default function PontoTab() {
  const queryClient = useQueryClient();
  const [funcId, setFuncId] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const [ponto, funcionarios] = useQueries({
    queries: [
      { queryKey: ["ponto"], queryFn: listarPonto },
      { queryKey: ["funcionarios"], queryFn: listarFuncionarios },
    ],
  });

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["ponto"] });

  const entradaMutation = useMutation({
    mutationFn: () => baterEntrada(Number(funcId)),
    onSuccess: invalidar,
    onError: (err) => setErro(extrairMensagemErro(err)),
  });
  const saidaMutation = useMutation({
    mutationFn: () => baterSaida(Number(funcId)),
    onSuccess: invalidar,
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  return (
    <Box>
      {erro && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro(null)}>
          {erro}
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 2, mb: 3, maxWidth: 560 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
          <TextField
            select
            label="Funcionário"
            size="small"
            value={funcId}
            onChange={(e) => setFuncId(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            {funcionarios.data
              ?.filter((f) => f.ativo)
              .map((f) => (
                <MenuItem key={f.funcionario_id} value={f.funcionario_id}>
                  {f.nome}
                </MenuItem>
              ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={<LoginIcon />}
            disabled={!funcId || entradaMutation.isPending}
            onClick={() => {
              setErro(null);
              entradaMutation.mutate();
            }}
          >
            Bater entrada
          </Button>
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            disabled={!funcId || saidaMutation.isPending}
            onClick={() => {
              setErro(null);
              saidaMutation.mutate();
            }}
          >
            Bater saída
          </Button>
        </Stack>
      </Paper>

      {ponto.isLoading ? (
        <CircularProgress size={24} />
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Funcionário</TableCell>
                <TableCell>Entrada</TableCell>
                <TableCell>Saída</TableCell>
                <TableCell>Situação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ponto.data?.map((p) => (
                <TableRow key={p.ponto_id} hover>
                  <TableCell>{p.funcionario_nome}</TableCell>
                  <TableCell>{formatarDataHora(p.entrada)}</TableCell>
                  <TableCell>{formatarDataHora(p.saida)}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.saida ? "Fechado" : "Em aberto"}
                      color={p.saida ? "default" : "success"}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {ponto.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    Nenhum registro de ponto.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
