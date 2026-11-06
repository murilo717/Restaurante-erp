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
import AddModeratorIcon from "@mui/icons-material/AddModerator";
import {
  atribuirPerfil,
  listarUsuarios,
  removerPerfil,
} from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type { UsuarioAdmin } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";

// Perfis existentes em sys.perfis.
const PERFIS = [
  "garcom",
  "cozinha",
  "supervisor",
  "gerente",
  "auditor",
  "ceo",
  "dba",
];

const COR_PERFIL: Record<string, "default" | "primary" | "secondary" | "warning" | "error"> = {
  garcom: "default",
  cozinha: "default",
  supervisor: "secondary",
  gerente: "primary",
  auditor: "warning",
  ceo: "error",
  dba: "error",
};

function LinhaUsuario({
  usuario,
  onAtribuir,
  onRemover,
  ocupado,
}: {
  usuario: UsuarioAdmin;
  onAtribuir: (id: number, perfil: string) => void;
  onRemover: (id: number, perfil: string, login: string) => void;
  ocupado: boolean;
}) {
  const [novo, setNovo] = useState("");
  // Só oferece perfis que o usuário ainda não tem.
  const disponiveis = PERFIS.filter((p) => !usuario.perfis.includes(p));

  return (
    <TableRow hover>
      <TableCell>
        <strong>{usuario.login}</strong>
        <Box component="span" sx={{ display: "block", fontSize: 12, color: "text.secondary" }}>
          {usuario.nome}
        </Box>
      </TableCell>
      <TableCell>{usuario.email}</TableCell>
      <TableCell>
        {usuario.funcionario_id ? (
          <Chip label={`Func. #${usuario.funcionario_id}`} size="small" color="success" variant="outlined" />
        ) : (
          <Chip label="sem vínculo" size="small" variant="outlined" />
        )}
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {usuario.perfis.length === 0 && (
            <Chip label="sem perfil" size="small" variant="outlined" />
          )}
          {usuario.perfis.map((p) => (
            <Chip
              key={p}
              label={p}
              size="small"
              color={COR_PERFIL[p] ?? "default"}
              onDelete={ocupado ? undefined : () => onRemover(usuario.usuario_id, p, usuario.login)}
              sx={{ textTransform: "capitalize" }}
            />
          ))}
        </Stack>
      </TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <TextField
            select
            size="small"
            label="Adicionar perfil"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            sx={{ minWidth: 150 }}
            disabled={disponiveis.length === 0}
          >
            {disponiveis.map((p) => (
              <MenuItem key={p} value={p} sx={{ textTransform: "capitalize" }}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddModeratorIcon />}
            disabled={!novo || ocupado}
            onClick={() => {
              onAtribuir(usuario.usuario_id, novo);
              setNovo("");
            }}
          >
            Promover
          </Button>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["usuarios-admin"],
    queryFn: listarUsuarios,
  });

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["usuarios-admin"] });

  const atribuirMutation = useMutation({
    mutationFn: ({ id, perfil }: { id: number; perfil: string }) =>
      atribuirPerfil(id, perfil),
    onSuccess: (_r, vars) => {
      setSucesso(`Perfil '${vars.perfil}' atribuído. O usuário deve sair e entrar de novo para valer.`);
      invalidar();
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  const removerMutation = useMutation({
    mutationFn: ({ id, perfil }: { id: number; perfil: string }) =>
      removerPerfil(id, perfil),
    onSuccess: (_r, vars) => {
      setSucesso(`Perfil '${vars.perfil}' removido. O usuário deve sair e entrar de novo para valer.`);
      invalidar();
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  const ocupado = atribuirMutation.isPending || removerMutation.isPending;

  return (
    <Box>
      <PageHeader
        titulo="Usuários e permissões"
        descricao="Promova usuários cadastrados atribuindo perfis, ou remova perfis. Toda conta nova nasce como garçom."
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

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {isError && <Alert severity="error">{extrairMensagemErro(error)}</Alert>}

      {data && (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuário</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell>Funcionário</TableCell>
                <TableCell>Perfis (clique no x para remover)</TableCell>
                <TableCell align="right">Promover</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((u) => (
                <LinhaUsuario
                  key={u.usuario_id}
                  usuario={u}
                  ocupado={ocupado}
                  onAtribuir={(id, perfil) => {
                    setErro(null);
                    setSucesso(null);
                    atribuirMutation.mutate({ id, perfil });
                  }}
                  onRemover={(id, perfil, login) => {
                    if (window.confirm(`Remover o perfil '${perfil}' de '${login}'?`)) {
                      setErro(null);
                      setSucesso(null);
                      removerMutation.mutate({ id, perfil });
                    }
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
