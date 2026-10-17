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
import AddIcon from "@mui/icons-material/Add";
import LinkIcon from "@mui/icons-material/Link";
import {
  criarFuncionario,
  listarFuncionarios,
  vincularUsuario,
} from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type { CargoFuncionario, Funcionario } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";
import { formatarMoeda } from "@/utils/format";

const CARGOS: CargoFuncionario[] = [
  "garcom",
  "cozinha",
  "gerente",
  "ceo",
  "dba",
];

interface FormNovo {
  nome: string;
  cpf: string;
  cargo: CargoFuncionario;
  salario: string;
}

const FORM_VAZIO: FormNovo = {
  nome: "",
  cpf: "",
  cargo: "garcom",
  salario: "",
};

export default function FuncionariosPage() {
  const queryClient = useQueryClient();

  const [dialogNovo, setDialogNovo] = useState(false);
  const [form, setForm] = useState<FormNovo>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  // vínculo
  const [vinculando, setVinculando] = useState<Funcionario | null>(null);
  const [loginVinculo, setLoginVinculo] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["funcionarios"],
    queryFn: listarFuncionarios,
  });

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["funcionarios"] });

  const criarMutation = useMutation({
    mutationFn: () =>
      criarFuncionario({
        nome: form.nome.trim(),
        cpf: form.cpf.replace(/\D/g, ""),
        cargo: form.cargo,
        salario: Number(form.salario),
      }),
    onSuccess: () => {
      setDialogNovo(false);
      setForm(FORM_VAZIO);
      invalidar();
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  const vincularMutation = useMutation({
    mutationFn: () =>
      vincularUsuario(vinculando!.funcionario_id, loginVinculo.trim()),
    onSuccess: () => {
      setVinculando(null);
      setLoginVinculo("");
      invalidar();
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  return (
    <Box>
      <PageHeader
        titulo="Funcionários"
        descricao="Cadastre funcionários e vincule os logins de acesso. O pedido registra o funcionário vinculado ao usuário que o anotou."
        acao={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setErro(null);
              setForm(FORM_VAZIO);
              setDialogNovo(true);
            }}
          >
            Novo funcionário
          </Button>
        }
      />

      {erro && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro(null)}>
          {erro}
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && <Alert severity="error">{extrairMensagemErro(error)}</Alert>}

      {!isLoading && !isError && (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Cargo</TableCell>
                <TableCell>CPF</TableCell>
                <TableCell align="right">Salário</TableCell>
                <TableCell>Usuário vinculado</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.map((f) => (
                <TableRow key={f.funcionario_id} hover>
                  <TableCell>{f.nome}</TableCell>
                  <TableCell>
                    <Chip
                      label={f.cargo}
                      size="small"
                      sx={{ textTransform: "capitalize" }}
                    />
                  </TableCell>
                  <TableCell>{f.cpf}</TableCell>
                  <TableCell align="right">
                    {formatarMoeda(f.salario)}
                  </TableCell>
                  <TableCell>
                    {f.usuario_login ? (
                      <Chip
                        label={f.usuario_login}
                        size="small"
                        color="secondary"
                      />
                    ) : (
                      <Chip label="sem vínculo" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<LinkIcon />}
                      onClick={() => {
                        setErro(null);
                        setLoginVinculo(f.usuario_login ?? "");
                        setVinculando(f);
                      }}
                    >
                      Vincular
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    Nenhum funcionário cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog novo funcionário */}
      <Dialog
        open={dialogNovo}
        onClose={() => setDialogNovo(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Novo funcionário</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Nome completo"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="CPF (somente números)"
              value={form.cpf}
              onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
              required
              fullWidth
              inputProps={{ maxLength: 14 }}
              helperText="11 dígitos"
            />
            <TextField
              label="Cargo"
              select
              value={form.cargo}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cargo: e.target.value as CargoFuncionario,
                }))
              }
              fullWidth
            >
              {CARGOS.map((c) => (
                <MenuItem key={c} value={c} sx={{ textTransform: "capitalize" }}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Salário (R$)"
              type="number"
              value={form.salario}
              onChange={(e) =>
                setForm((f) => ({ ...f, salario: e.target.value }))
              }
              required
              fullWidth
              inputProps={{ min: 0, step: "0.01" }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogNovo(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => {
              setErro(null);
              criarMutation.mutate();
            }}
            disabled={criarMutation.isPending}
          >
            {criarMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog vincular usuário */}
      <Dialog
        open={vinculando !== null}
        onClose={() => setVinculando(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Vincular usuário</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Alert severity="info">
              Associe o login de um usuário já cadastrado ao funcionário{" "}
              <strong>{vinculando?.nome}</strong>. Depois disso, os pedidos
              anotados por esse usuário ficam registrados neste funcionário.
            </Alert>
            <TextField
              label="Login do usuário"
              value={loginVinculo}
              onChange={(e) => setLoginVinculo(e.target.value)}
              required
              fullWidth
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVinculando(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => {
              setErro(null);
              vincularMutation.mutate();
            }}
            disabled={!loginVinculo.trim() || vincularMutation.isPending}
          >
            {vincularMutation.isPending ? "Vinculando..." : "Vincular"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
