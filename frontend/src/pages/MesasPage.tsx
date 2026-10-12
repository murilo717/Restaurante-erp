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
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import TableRestaurantIcon from "@mui/icons-material/TableRestaurant";
import {
  alterarStatusMesa,
  atualizarMesa,
  criarMesa,
  listarMesas,
} from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type { Mesa, StatusMesa } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/auth/AuthContext";

const STATUS_INFO: Record<
  StatusMesa,
  { rotulo: string; cor: "success" | "error" | "warning" | "default" }
> = {
  livre: { rotulo: "Livre", cor: "success" },
  ocupada: { rotulo: "Ocupada", cor: "error" },
  reservada: { rotulo: "Reservada", cor: "warning" },
  manutencao: { rotulo: "Manutenção", cor: "default" },
};

const TODOS_STATUS = Object.keys(STATUS_INFO) as StatusMesa[];

interface FormMesa {
  numero: string;
  capacidade: string;
  status: StatusMesa;
}

const FORM_VAZIO: FormMesa = { numero: "", capacidade: "", status: "livre" };

export default function MesasPage() {
  const queryClient = useQueryClient();
  const { temPerfil } = useAuth();
  const podeGerir = temPerfil("gerente", "supervisor");

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Mesa | null>(null);
  const [form, setForm] = useState<FormMesa>(FORM_VAZIO);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["mesas"],
    queryFn: listarMesas,
  });

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["mesas"] });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusMesa }) =>
      alterarStatusMesa(id, status),
    onSuccess: invalidar,
  });

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        numero: Number(form.numero),
        capacidade: Number(form.capacidade),
        status: form.status,
      };
      if (editando) {
        return atualizarMesa(editando.mesa_id, payload);
      }
      return criarMesa(payload);
    },
    onSuccess: () => {
      invalidar();
      fecharDialog();
    },
    onError: (err) => setErroForm(extrairMensagemErro(err)),
  });

  function abrirCriar() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setErroForm(null);
    setDialogAberto(true);
  }

  function abrirEditar(mesa: Mesa) {
    setEditando(mesa);
    setForm({
      numero: String(mesa.numero),
      capacidade: String(mesa.capacidade),
      status: mesa.status,
    });
    setErroForm(null);
    setDialogAberto(true);
  }

  function fecharDialog() {
    setDialogAberto(false);
    setEditando(null);
  }

  function salvar() {
    setErroForm(null);
    if (Number(form.numero) <= 0 || Number(form.capacidade) <= 0) {
      setErroForm("Número e capacidade devem ser maiores que zero.");
      return;
    }
    salvarMutation.mutate();
  }

  return (
    <Box>
      <PageHeader
        titulo="Mesas"
        descricao="Ocupação do salão em tempo real."
        acao={
          podeGerir ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={abrirCriar}
            >
              Nova mesa
            </Button>
          ) : undefined
        }
      />

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && <Alert severity="error">{extrairMensagemErro(error)}</Alert>}

      {!isLoading && !isError && data && data.length === 0 && (
        <Alert severity="info">
          Nenhuma mesa cadastrada ainda.
          {podeGerir ? ' Clique em "Nova mesa" para começar.' : ""}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
        }}
      >
        {data?.map((mesa) => {
          const info = STATUS_INFO[mesa.status];
          return (
            <Card key={mesa.mesa_id} elevation={2}>
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TableRestaurantIcon color="action" />
                    <Typography variant="h6" fontWeight={700}>
                      Mesa {mesa.numero}
                    </Typography>
                  </Stack>
                  {podeGerir && (
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => abrirEditar(mesa)}
                    >
                      Editar
                    </Button>
                  )}
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  Capacidade: {mesa.capacidade}{" "}
                  {mesa.capacidade === 1 ? "lugar" : "lugares"}
                </Typography>

                <Box mt={1.5} mb={1}>
                  <Chip label={info.rotulo} color={info.cor} size="small" />
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {TODOS_STATUS.filter((s) => s !== mesa.status).map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant="outlined"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({ id: mesa.mesa_id, status: s })
                      }
                    >
                      {STATUS_INFO[s].rotulo}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Dialog open={dialogAberto} onClose={fecharDialog} fullWidth maxWidth="xs">
        <DialogTitle>{editando ? "Editar mesa" : "Nova mesa"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {erroForm && <Alert severity="error">{erroForm}</Alert>}
            <TextField
              label="Número"
              type="number"
              value={form.numero}
              onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
              required
              fullWidth
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Capacidade"
              type="number"
              value={form.capacidade}
              onChange={(e) =>
                setForm((f) => ({ ...f, capacidade: e.target.value }))
              }
              required
              fullWidth
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Status"
              select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as StatusMesa }))
              }
              fullWidth
            >
              {TODOS_STATUS.map((s) => (
                <MenuItem key={s} value={s}>
                  {STATUS_INFO[s].rotulo}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={salvar}
            disabled={salvarMutation.isPending}
          >
            {salvarMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
