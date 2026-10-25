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
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
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
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  alterarStatusOrdem,
  criarOrdem,
  listarCapacidade,
  listarCentros,
  listarOrdens,
  listarPratos,
} from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type { StatusOP } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";

const STATUS_OP: Record<
  StatusOP,
  { rotulo: string; cor: "default" | "info" | "warning" | "success" | "error" }
> = {
  planejada: { rotulo: "Planejada", cor: "info" },
  em_andamento: { rotulo: "Em andamento", cor: "warning" },
  concluida: { rotulo: "Concluída", cor: "success" },
  cancelada: { rotulo: "Cancelada", cor: "error" },
};

const PROXIMOS: Record<StatusOP, StatusOP[]> = {
  planejada: ["em_andamento", "cancelada"],
  em_andamento: ["concluida", "cancelada"],
  concluida: [],
  cancelada: [],
};

export default function ProducaoPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [pratoId, setPratoId] = useState("");
  const [centroId, setCentroId] = useState("");
  const [qtd, setQtd] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const [ordens, centros, capacidade, pratos] = useQueries({
    queries: [
      { queryKey: ["ordens"], queryFn: listarOrdens },
      { queryKey: ["centros"], queryFn: listarCentros },
      { queryKey: ["capacidade"], queryFn: listarCapacidade },
      { queryKey: ["pratos"], queryFn: listarPratos },
    ],
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["ordens"] });
    queryClient.invalidateQueries({ queryKey: ["capacidade"] });
  };

  const criarMutation = useMutation({
    mutationFn: () =>
      criarOrdem({
        prato_id: Number(pratoId),
        centro_id: Number(centroId),
        quantidade: Number(qtd),
      }),
    onSuccess: () => {
      setDialog(false);
      setPratoId("");
      setCentroId("");
      setQtd("");
      invalidar();
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusOP }) =>
      alterarStatusOrdem(id, status),
    onSuccess: invalidar,
  });

  return (
    <Box>
      <PageHeader
        titulo="Produção"
        descricao="Ordens de produção e ocupação dos centros de trabalho."
        acao={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setErro(null);
              setDialog(true);
            }}
          >
            Nova ordem
          </Button>
        }
      />

      {erro && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro(null)}>
          {erro}
        </Alert>
      )}

      {/* Capacidade dos centros */}
      <Typography variant="h6" fontWeight={700} mb={1}>
        Capacidade do dia
      </Typography>
      {capacidade.isLoading ? (
        <CircularProgress size={24} />
      ) : capacidade.data && capacidade.data.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
            mb: 3,
          }}
        >
          {capacidade.data.map((c) => (
            <Card key={`${c.centro_id}-${c.data_prevista}`} elevation={2}>
              <CardContent>
                <Typography fontWeight={600}>{c.centro}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {c.data_prevista}
                </Typography>
                <Box mt={1}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(c.ocupacao_pct, 100)}
                    color={c.ocupacao_pct > 100 ? "error" : "primary"}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" mt={0.5}>
                    {c.porcoes_planejadas} / {c.capacidade_dia} porções (
                    {c.ocupacao_pct}%)
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          Nenhuma ordem planejada para calcular capacidade.
        </Alert>
      )}

      {/* Ordens de produção */}
      <Typography variant="h6" fontWeight={700} mb={1}>
        Ordens de produção
      </Typography>
      {ordens.isLoading ? (
        <CircularProgress size={24} />
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>OP</TableCell>
                <TableCell>Prato</TableCell>
                <TableCell>Centro</TableCell>
                <TableCell align="right">Qtd</TableCell>
                <TableCell>Prevista</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ordens.data?.map((o) => (
                <TableRow key={o.op_id} hover>
                  <TableCell>#{o.op_id}</TableCell>
                  <TableCell>{o.prato_nome}</TableCell>
                  <TableCell>{o.centro_nome}</TableCell>
                  <TableCell align="right">{o.quantidade}</TableCell>
                  <TableCell>{o.data_prevista}</TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_OP[o.status].rotulo}
                      color={STATUS_OP[o.status].cor}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="flex-end"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {PROXIMOS[o.status].map((s) => (
                        <Button
                          key={s}
                          size="small"
                          variant={s === "cancelada" ? "outlined" : "contained"}
                          color={s === "cancelada" ? "error" : "primary"}
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({ id: o.op_id, status: s })
                          }
                        >
                          {STATUS_OP[s].rotulo}
                        </Button>
                      ))}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {ordens.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    Nenhuma ordem de produção.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog nova ordem */}
      <Dialog open={dialog} onClose={() => setDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nova ordem de produção</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Prato"
              value={pratoId}
              onChange={(e) => setPratoId(e.target.value)}
              fullWidth
            >
              {pratos.data?.map((p) => (
                <MenuItem key={p.prato_id} value={p.prato_id}>
                  {p.nome}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Centro de trabalho"
              value={centroId}
              onChange={(e) => setCentroId(e.target.value)}
              fullWidth
              helperText={
                centros.data && centros.data.length === 0
                  ? "Nenhum centro cadastrado no banco."
                  : undefined
              }
            >
              {centros.data?.map((c) => (
                <MenuItem key={c.centro_id} value={c.centro_id}>
                  {c.nome} ({c.capacidade_porcoes_hora}/h)
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Quantidade (porções)"
              type="number"
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              fullWidth
              inputProps={{ min: 1 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!pratoId || !centroId || !qtd || criarMutation.isPending}
            onClick={() => {
              setErro(null);
              criarMutation.mutate();
            }}
          >
            {criarMutation.isPending ? "Criando..." : "Criar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
