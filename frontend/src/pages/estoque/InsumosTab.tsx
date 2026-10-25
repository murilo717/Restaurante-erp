import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { listarInsumos } from "@/api/services";
import { extrairMensagemErro } from "@/api/client";

export default function InsumosTab() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["insumos"],
    queryFn: listarInsumos,
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
            <TableCell>Insumo</TableCell>
            <TableCell>Unidade</TableCell>
            <TableCell align="right">Em estoque</TableCell>
            <TableCell align="right">Mínimo</TableCell>
            <TableCell>Validade</TableCell>
            <TableCell>Situação</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data?.map((i) => (
            <TableRow key={i.insumo_id} hover>
              <TableCell>{i.nome}</TableCell>
              <TableCell>{i.unidade_medida}</TableCell>
              <TableCell align="right">{i.quantidade_estoque}</TableCell>
              <TableCell align="right">{i.estoque_minimo}</TableCell>
              <TableCell>{i.data_validade ?? "—"}</TableCell>
              <TableCell>
                {i.abaixo_minimo ? (
                  <Chip
                    icon={<WarningAmberIcon />}
                    label="Abaixo do mínimo"
                    color="warning"
                    size="small"
                  />
                ) : (
                  <Chip label="OK" color="success" size="small" variant="outlined" />
                )}
              </TableCell>
            </TableRow>
          ))}
          {data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                Nenhum insumo cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
