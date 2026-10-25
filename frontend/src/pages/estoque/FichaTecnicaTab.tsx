import { useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  definirItemFicha,
  listarInsumos,
  listarPratos,
  removerItemFicha,
  verFicha,
} from "@/api/services";
import { extrairMensagemErro } from "@/api/client";

export default function FichaTecnicaTab() {
  const queryClient = useQueryClient();
  const [pratoId, setPratoId] = useState<string>("");
  const [insumoId, setInsumoId] = useState<string>("");
  const [qtd, setQtd] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const [pratos, insumos] = useQueries({
    queries: [
      { queryKey: ["pratos"], queryFn: listarPratos },
      { queryKey: ["insumos"], queryFn: listarInsumos },
    ],
  });

  const fichaQuery = useQuery({
    queryKey: ["ficha", pratoId],
    queryFn: () => verFicha(Number(pratoId)),
    enabled: pratoId !== "",
  });

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["ficha", pratoId] });

  const addMutation = useMutation({
    mutationFn: () =>
      definirItemFicha(Number(pratoId), Number(insumoId), Number(qtd)),
    onSuccess: () => {
      setInsumoId("");
      setQtd("");
      invalidar();
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  const delMutation = useMutation({
    mutationFn: (insumo: number) => removerItemFicha(Number(pratoId), insumo),
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

      <TextField
        select
        label="Prato"
        value={pratoId}
        onChange={(e) => setPratoId(e.target.value)}
        sx={{ minWidth: 260, mb: 2 }}
      >
        {pratos.data?.map((p) => (
          <MenuItem key={p.prato_id} value={p.prato_id}>
            {p.nome}
          </MenuItem>
        ))}
      </TextField>

      {pratoId === "" && (
        <Alert severity="info">
          Selecione um prato para ver e editar sua ficha técnica (insumos
          consumidos por porção).
        </Alert>
      )}

      {pratoId !== "" && fichaQuery.isLoading && <CircularProgress size={24} />}

      {fichaQuery.data && (
        <Paper elevation={2} sx={{ p: 2, maxWidth: 640 }}>
          <Typography variant="h6" fontWeight={700} mb={1}>
            {fichaQuery.data.prato_nome}
          </Typography>

          {/* adicionar insumo */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            mb={2}
            alignItems={{ sm: "center" }}
          >
            <TextField
              select
              label="Insumo"
              size="small"
              value={insumoId}
              onChange={(e) => setInsumoId(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {insumos.data?.map((i) => (
                <MenuItem key={i.insumo_id} value={i.insumo_id}>
                  {i.nome} ({i.unidade_medida})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Qtd necessária"
              type="number"
              size="small"
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              inputProps={{ min: 0, step: "0.001" }}
              sx={{ width: 140 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!insumoId || !qtd || addMutation.isPending}
              onClick={() => {
                setErro(null);
                addMutation.mutate();
              }}
            >
              Adicionar
            </Button>
          </Stack>

          <Divider sx={{ mb: 1 }} />

          {fichaQuery.data.itens.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              Nenhum insumo na ficha. Sem ficha técnica, a baixa automática de
              estoque não ocorre no pagamento.
            </Typography>
          ) : (
            <Stack divider={<Divider />}>
              {fichaQuery.data.itens.map((item) => (
                <Stack
                  key={item.insumo_id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  py={1}
                >
                  <Typography>
                    {item.insumo_nome} — {item.quantidade_necessaria}{" "}
                    {item.unidade_medida}
                  </Typography>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={delMutation.isPending}
                    onClick={() => delMutation.mutate(item.insumo_id)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
}
