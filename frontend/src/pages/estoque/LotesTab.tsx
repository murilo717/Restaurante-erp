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
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { alterarStatusLote, listarLotes } from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type { StatusLote } from "@/api/types";

const STATUS: Record<
  StatusLote,
  { rotulo: string; cor: "default" | "success" | "error" }
> = {
  em_inspecao: { rotulo: "Em inspeção", cor: "default" },
  liberado: { rotulo: "Liberado", cor: "success" },
  bloqueado: { rotulo: "Bloqueado", cor: "error" },
};

export default function LotesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["lotes"],
    queryFn: listarLotes,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusLote }) =>
      alterarStatusLote(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lotes"] }),
  });

  if (isLoading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  if (isError) return <Alert severity="error">{extrairMensagemErro(error)}</Alert>;

  return (
    <TableContainer component={Paper} elevation={2}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Lote</TableCell>
            <TableCell>Insumo</TableCell>
            <TableCell align="right">Qtd inicial</TableCell>
            <TableCell>Validade</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data?.map((l) => (
            <TableRow key={l.lote_id} hover>
              <TableCell>{l.codigo_lote}</TableCell>
              <TableCell>{l.insumo_nome}</TableCell>
              <TableCell align="right">{l.quantidade_inicial}</TableCell>
              <TableCell>{l.validade ?? "—"}</TableCell>
              <TableCell>
                <Chip
                  label={STATUS[l.status].rotulo}
                  color={STATUS[l.status].cor}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  {l.status !== "liberado" && (
                    <Button
                      size="small"
                      color="success"
                      variant="outlined"
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({ id: l.lote_id, status: "liberado" })
                      }
                    >
                      Liberar
                    </Button>
                  )}
                  {l.status !== "bloqueado" && (
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({ id: l.lote_id, status: "bloqueado" })
                      }
                    >
                      Bloquear
                    </Button>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                Nenhum lote. Lotes são gerados ao receber uma compra.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
