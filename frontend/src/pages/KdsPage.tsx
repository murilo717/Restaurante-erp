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
  Stack,
  Typography,
} from "@mui/material";
import { avancarStatusKDS, listarKDS } from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type { ItemKDS, StatusProducao } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";

const COLUNAS: {
  status: StatusProducao;
  titulo: string;
  cor: string;
  proximo?: StatusProducao;
  rotuloBotao?: string;
}[] = [
  {
    status: "fila",
    titulo: "Na fila",
    cor: "#64748b",
    proximo: "preparando",
    rotuloBotao: "Iniciar preparo",
  },
  {
    status: "preparando",
    titulo: "Preparando",
    cor: "#c2410c",
    proximo: "pronto",
    rotuloBotao: "Marcar pronto",
  },
  {
    status: "pronto",
    titulo: "Pronto",
    cor: "#15803d",
    proximo: "entregue",
    rotuloBotao: "Entregar",
  },
];

export default function KdsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["kds"],
    queryFn: listarKDS,
    // A cozinha é dinâmica: atualiza sozinho a cada 10s.
    refetchInterval: 10_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusProducao }) =>
      avancarStatusKDS(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kds"] }),
  });

  const porStatus = (s: StatusProducao): ItemKDS[] =>
    data?.filter((i) => i.status_producao === s) ?? [];

  return (
    <Box>
      <PageHeader
        titulo="Cozinha (KDS)"
        descricao="Fila de preparo em tempo real. Avance cada item conforme produz."
      />

      {isError && <Alert severity="error">{extrairMensagemErro(error)}</Alert>}

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            alignItems: "start",
          }}
        >
          {COLUNAS.map((col) => {
            const itens = porStatus(col.status);
            return (
              <Box key={col.status}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    borderBottom: 3,
                    borderColor: col.cor,
                    pb: 1,
                    mb: 1.5,
                  }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    {col.titulo}
                  </Typography>
                  <Chip label={itens.length} size="small" />
                </Stack>

                <Stack spacing={1.5}>
                  {itens.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Nenhum item.
                    </Typography>
                  )}
                  {itens.map((item) => (
                    <Card
                      key={item.item_id}
                      elevation={2}
                      sx={{ borderLeft: 5, borderColor: col.cor }}
                    >
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {item.quantidade}× {item.prato_nome}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pedido #{item.pedido_id} ·{" "}
                          {item.mesa_numero
                            ? `Mesa ${item.mesa_numero}`
                            : item.canal}
                        </Typography>
                        {col.proximo && (
                          <Button
                            fullWidth
                            variant="contained"
                            size="small"
                            sx={{ mt: 1.5, bgcolor: col.cor }}
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({
                                id: item.item_id,
                                status: col.proximo as StatusProducao,
                              })
                            }
                          >
                            {col.rotuloBotao}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
