import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import AddIcon from "@mui/icons-material/Add";
import {
  criarContaPagar,
  listarContasPagar,
  pagarConta,
} from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type { StatusContaPagar } from "@/api/types";
import { formatarMoeda } from "@/utils/format";

const STATUS: Record<
  StatusContaPagar,
  { rotulo: string; cor: "default" | "success" | "error" | "warning" }
> = {
  aberta: { rotulo: "Aberta", cor: "warning" },
  paga: { rotulo: "Paga", cor: "success" },
  atrasada: { rotulo: "Atrasada", cor: "error" },
  cancelada: { rotulo: "Cancelada", cor: "default" },
};

export default function ContasPagarTab() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ descricao: "", valor: "", vencimento: "" });
  const [erro, setErro] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["contas-pagar"],
    queryFn: listarContasPagar,
  });

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["contas-pagar"] });

  const criarMutation = useMutation({
    mutationFn: () =>
      criarContaPagar({
        descricao: form.descricao.trim(),
        valor: Number(form.valor),
        vencimento: form.vencimento,
      }),
    onSuccess: () => {
      setDialog(false);
      setForm({ descricao: "", valor: "", vencimento: "" });
      invalidar();
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  const pagarMutation = useMutation({
    mutationFn: (id: number) => pagarConta(id),
    onSuccess: invalidar,
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  if (isLoading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  if (isError) return <Alert severity="error">{extrairMensagemErro(error)}</Alert>;

  return (
    <Box>
      {erro && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro(null)}>
          {erro}
        </Alert>
      )}

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        sx={{ mb: 2 }}
        onClick={() => {
          setErro(null);
          setDialog(true);
        }}
      >
        Nova conta a pagar
      </Button>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Descrição</TableCell>
              <TableCell>Fornecedor</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Vencimento</TableCell>
              <TableCell>Pago em</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((c) => (
              <TableRow key={c.cp_id} hover>
                <TableCell>{c.descricao}</TableCell>
                <TableCell>{c.fornecedor_nome ?? "—"}</TableCell>
                <TableCell align="right">{formatarMoeda(c.valor)}</TableCell>
                <TableCell>{c.vencimento}</TableCell>
                <TableCell>{c.pago_em ?? "—"}</TableCell>
                <TableCell>
                  <Chip
                    label={STATUS[c.status].rotulo}
                    color={STATUS[c.status].cor}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {c.status === "aberta" || c.status === "atrasada" ? (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={pagarMutation.isPending}
                      onClick={() => {
                        setErro(null);
                        pagarMutation.mutate(c.cp_id);
                      }}
                    >
                      Pagar
                    </Button>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  Nenhuma conta a pagar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialog} onClose={() => setDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nova conta a pagar</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Descrição"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Valor (R$)"
              type="number"
              value={form.valor}
              onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
              fullWidth
              inputProps={{ min: 0, step: "0.01" }}
            />
            <TextField
              label="Vencimento"
              type="date"
              value={form.vencimento}
              onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={
              !form.descricao || !form.valor || !form.vencimento || criarMutation.isPending
            }
            onClick={() => {
              setErro(null);
              criarMutation.mutate();
            }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
