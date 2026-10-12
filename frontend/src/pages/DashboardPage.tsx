import { useQueries } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { statusModulo } from "@/api/services";
import { useAuth } from "@/auth/AuthContext";
import { PageHeader } from "@/components/PageHeader";

const MODULOS = [
  { id: "bi", nome: "Business Intelligence" },
  { id: "mm", nome: "Gestão de Materiais" },
  { id: "pp", nome: "Produção" },
  { id: "rh", nome: "Recursos Humanos" },
];

export default function DashboardPage() {
  const { usuario } = useAuth();

  const resultados = useQueries({
    queries: MODULOS.map((m) => ({
      queryKey: ["status", m.id],
      queryFn: () => statusModulo(m.id),
    })),
  });

  return (
    <Box>
      <PageHeader
        titulo={`Bem-vindo, ${usuario?.login ?? ""}`}
        descricao="Visão geral do sistema e disponibilidade dos módulos."
      />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
        }}
      >
        {MODULOS.map((m, i) => {
          const q = resultados[i];
          const online = q.data?.status === "disponivel";
          return (
            <Box key={m.id}>
              <Card elevation={2}>
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                  >
                    <Box>
                      <Typography
                        variant="overline"
                        color="text.secondary"
                      >
                        {m.id.toUpperCase()}
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {m.nome}
                      </Typography>
                    </Box>
                    {q.isLoading ? (
                      <Chip label="..." size="small" />
                    ) : online ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </Stack>
                  <Box mt={1.5}>
                    <Chip
                      size="small"
                      color={online ? "success" : q.isLoading ? "default" : "error"}
                      label={
                        q.isLoading
                          ? "Verificando"
                          : online
                            ? "Disponível"
                            : "Indisponível"
                      }
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
