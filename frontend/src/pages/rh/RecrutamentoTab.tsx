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
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  alterarStatusVaga,
  criarCandidato,
  criarVaga,
  listarCandidatos,
  listarVagas,
  moverEtapaCandidato,
} from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type {
  CargoFuncionario,
  EtapaCandidato,
  StatusVaga,
  Vaga,
} from "@/api/types";

const CARGOS: CargoFuncionario[] = ["garcom", "cozinha", "gerente", "ceo", "dba"];

const STATUS_VAGA: Record<
  StatusVaga,
  { rotulo: string; cor: "success" | "default" | "error" }
> = {
  aberta: { rotulo: "Aberta", cor: "success" },
  preenchida: { rotulo: "Preenchida", cor: "default" },
  cancelada: { rotulo: "Cancelada", cor: "error" },
};

const ETAPAS: EtapaCandidato[] = [
  "triagem",
  "entrevista",
  "proposta",
  "contratado",
  "reprovado",
];

function CandidatosDaVaga({ vagaId }: { vagaId: number }) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  const { data } = useQuery({
    queryKey: ["candidatos", vagaId],
    queryFn: () => listarCandidatos(vagaId),
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["candidatos", vagaId] });
    queryClient.invalidateQueries({ queryKey: ["vagas"] });
  };

  const addMutation = useMutation({
    mutationFn: () => criarCandidato(vagaId, { nome: nome.trim(), email: email.trim() || null }),
    onSuccess: () => {
      setNome("");
      setEmail("");
      invalidar();
    },
  });

  const etapaMutation = useMutation({
    mutationFn: ({ id, etapa }: { id: number; etapa: EtapaCandidato }) =>
      moverEtapaCandidato(id, etapa),
    onSuccess: invalidar,
  });

  return (
    <Box mt={1}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mb={1}>
        <TextField
          label="Nome do candidato"
          size="small"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <TextField
          label="E-mail"
          size="small"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          disabled={!nome || addMutation.isPending}
          onClick={() => addMutation.mutate()}
        >
          Adicionar
        </Button>
      </Stack>
      <Stack divider={<Divider />}>
        {data?.map((c) => (
          <Stack
            key={c.candidato_id}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            py={0.5}
          >
            <Typography variant="body2">
              {c.nome} {c.email ? `· ${c.email}` : ""}
            </Typography>
            <TextField
              select
              size="small"
              value={c.etapa}
              onChange={(e) =>
                etapaMutation.mutate({
                  id: c.candidato_id,
                  etapa: e.target.value as EtapaCandidato,
                })
              }
              sx={{ minWidth: 140 }}
            >
              {ETAPAS.map((et) => (
                <MenuItem key={et} value={et} sx={{ textTransform: "capitalize" }}>
                  {et}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        ))}
        {data?.length === 0 && (
          <Typography variant="body2" color="text.secondary" py={1}>
            Nenhum candidato nesta vaga.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

export default function RecrutamentoTab() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [cargo, setCargo] = useState<CargoFuncionario>("garcom");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [expandida, setExpandida] = useState<number | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["vagas"],
    queryFn: listarVagas,
  });

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["vagas"] });

  const criarMutation = useMutation({
    mutationFn: () => criarVaga({ cargo, descricao: descricao.trim() || null }),
    onSuccess: () => {
      setDialog(false);
      setDescricao("");
      invalidar();
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusVaga }) =>
      alterarStatusVaga(id, status),
    onSuccess: invalidar,
  });

  if (isLoading) return <CircularProgress size={24} />;
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
        Nova vaga
      </Button>

      <Stack spacing={2}>
        {data?.map((v: Vaga) => (
          <Card key={v.vaga_id} elevation={2}>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography fontWeight={700} sx={{ textTransform: "capitalize" }}>
                    {v.cargo}{" "}
                    <Chip
                      label={STATUS_VAGA[v.status].rotulo}
                      color={STATUS_VAGA[v.status].cor}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  {v.descricao && (
                    <Typography variant="body2" color="text.secondary">
                      {v.descricao}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Aberta em {v.aberta_em} · {v.qtd_candidatos} candidato(s)
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    onClick={() =>
                      setExpandida(expandida === v.vaga_id ? null : v.vaga_id)
                    }
                  >
                    {expandida === v.vaga_id ? "Ocultar" : "Candidatos"}
                  </Button>
                  {v.status === "aberta" && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() =>
                          statusMutation.mutate({
                            id: v.vaga_id,
                            status: "preenchida",
                          })
                        }
                      >
                        Preencher
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() =>
                          statusMutation.mutate({
                            id: v.vaga_id,
                            status: "cancelada",
                          })
                        }
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </Stack>
              </Stack>

              {expandida === v.vaga_id && <CandidatosDaVaga vagaId={v.vaga_id} />}
            </CardContent>
          </Card>
        ))}
        {data?.length === 0 && (
          <Alert severity="info">Nenhuma vaga cadastrada.</Alert>
        )}
      </Stack>

      <Dialog open={dialog} onClose={() => setDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nova vaga</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value as CargoFuncionario)}
              fullWidth
            >
              {CARGOS.map((c) => (
                <MenuItem key={c} value={c} sx={{ textTransform: "capitalize" }}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Descrição (opcional)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={criarMutation.isPending}
            onClick={() => {
              setErro(null);
              criarMutation.mutate();
            }}
          >
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
