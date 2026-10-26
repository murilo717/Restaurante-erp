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
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import StarIcon from "@mui/icons-material/Star";
import RedeemIcon from "@mui/icons-material/Redeem";
import {
  criarCliente,
  listarClientes,
  resgatarPontos,
} from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type { Cliente } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [dialogNovo, setDialogNovo] = useState(false);
  const [form, setForm] = useState({ nome: "", cpf: "", telefone: "", email: "" });

  const [resgate, setResgate] = useState<Cliente | null>(null);
  const [pontosResgate, setPontosResgate] = useState("");
  const [motivoResgate, setMotivoResgate] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["clientes"],
    queryFn: listarClientes,
  });

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["clientes"] });

  const criarMutation = useMutation({
    mutationFn: () =>
      criarCliente({
        nome: form.nome.trim(),
        cpf: form.cpf.replace(/\D/g, "") || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
      }),
    onSuccess: () => {
      setDialogNovo(false);
      setForm({ nome: "", cpf: "", telefone: "", email: "" });
      invalidar();
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  const resgateMutation = useMutation({
    mutationFn: () =>
      resgatarPontos(
        resgate!.cliente_id,
        Number(pontosResgate),
        motivoResgate.trim() || "Resgate de pontos",
      ),
    onSuccess: (r) => {
      setResgate(null);
      setPontosResgate("");
      setMotivoResgate("");
      setSucesso(r.mensagem);
      invalidar();
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  if (isLoading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
      <PageHeader
        titulo="Clientes"
        descricao="Cadastro de clientes e clube de fidelidade. A cada R$ 1 gasto em pedidos pagos, o cliente acumula 1 ponto."
        acao={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setErro(null);
              setForm({ nome: "", cpf: "", telefone: "", email: "" });
              setDialogNovo(true);
            }}
          >
            Novo cliente
          </Button>
        }
      />

      {erro && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro(null)}>
          {erro}
        </Alert>
      )}
      {sucesso && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSucesso(null)}>
          {sucesso}
        </Alert>
      )}
      {isError && <Alert severity="error">{extrairMensagemErro(error)}</Alert>}

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell align="right">Pontos</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((c) => (
              <TableRow key={c.cliente_id} hover>
                <TableCell>{c.nome}</TableCell>
                <TableCell>{c.telefone ?? "—"}</TableCell>
                <TableCell>{c.email ?? "—"}</TableCell>
                <TableCell align="right">
                  <Chip
                    icon={<StarIcon />}
                    label={c.pontos_fidelidade}
                    color={c.pontos_fidelidade > 0 ? "warning" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    startIcon={<RedeemIcon />}
                    disabled={c.pontos_fidelidade <= 0}
                    onClick={() => {
                      setErro(null);
                      setPontosResgate("");
                      setMotivoResgate("");
                      setResgate(c);
                    }}
                  >
                    Resgatar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  Nenhum cliente cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog novo cliente */}
      <Dialog open={dialogNovo} onClose={() => setDialogNovo(false)} fullWidth maxWidth="xs">
        <DialogTitle>Novo cliente</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="CPF (opcional)"
              value={form.cpf}
              onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
              fullWidth
              inputProps={{ maxLength: 14 }}
            />
            <TextField
              label="Telefone (opcional)"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="E-mail (opcional)"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogNovo(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!form.nome || criarMutation.isPending}
            onClick={() => {
              setErro(null);
              criarMutation.mutate();
            }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog resgate de pontos */}
      <Dialog open={resgate !== null} onClose={() => setResgate(null)} fullWidth maxWidth="xs">
        <DialogTitle>Resgatar pontos</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2">
              Cliente: <strong>{resgate?.nome}</strong> — saldo atual:{" "}
              <strong>{resgate?.pontos_fidelidade} pontos</strong>
            </Typography>
            <TextField
              label="Pontos a resgatar"
              type="number"
              value={pontosResgate}
              onChange={(e) => setPontosResgate(e.target.value)}
              fullWidth
              inputProps={{ min: 1, max: resgate?.pontos_fidelidade }}
            />
            <TextField
              label="Motivo"
              value={motivoResgate}
              onChange={(e) => setMotivoResgate(e.target.value)}
              fullWidth
              placeholder="Ex.: Sobremesa grátis"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResgate(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!pontosResgate || resgateMutation.isPending}
            onClick={() => {
              setErro(null);
              resgateMutation.mutate();
            }}
          >
            Resgatar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
