import { useQueries } from "@tanstack/react-query";
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { statusModulo } from "@/api/services";
import { PageHeader } from "@/components/PageHeader";

const MODULOS = [
  { id: "bi", nome: "Business Intelligence", descricao: "Relatórios e indicadores" },
  { id: "mm", nome: "Gestão de Materiais", descricao: "Estoque e insumos" },
  { id: "pp", nome: "Produção", descricao: "Planejamento de produção" },
  { id: "rh", nome: "Recursos Humanos", descricao: "Colaboradores e escalas" },
];

export default function ModulosPage() {
  const resultados = useQueries({
    queries: MODULOS.map((m) => ({
      queryKey: ["status", m.id],
      queryFn: () => statusModulo(m.id),
    })),
  });

  return (
    <Box>
      <PageHeader
        titulo="Módulos"
        descricao="Status dos módulos do ERP. Novas telas serão adicionadas conforme o backend ganhar endpoints."
      />

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Módulo</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell align="right">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MODULOS.map((m, i) => {
              const q = resultados[i];
              const online = q.data?.status === "disponivel";
              return (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <strong>{m.nome}</strong>{" "}
                    <Chip
                      label={m.id.toUpperCase()}
                      size="small"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  </TableCell>
                  <TableCell>{m.descricao}</TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      color={
                        q.isLoading ? "default" : online ? "success" : "error"
                      }
                      label={
                        q.isLoading
                          ? "Verificando"
                          : online
                            ? "Disponível"
                            : "Indisponível"
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
