import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { listarPratos } from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import { PageHeader } from "@/components/PageHeader";
import { formatarMoeda } from "@/utils/format";

export default function PratosPage() {
  const [busca, setBusca] = useState("");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["pratos"],
    queryFn: listarPratos,
  });

  const pratosFiltrados = useMemo(() => {
    if (!data) return [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return data;
    return data.filter((p) => p.nome.toLowerCase().includes(termo));
  }, [data, busca]);

  return (
    <Box>
      <PageHeader
        titulo="Cardápio"
        descricao="Pratos ativos cadastrados no sistema."
      />

      <TextField
        placeholder="Buscar prato..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        size="small"
        sx={{ mb: 2, maxWidth: 360 }}
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">{extrairMensagemErro(error)}</Alert>
      )}

      {!isLoading && !isError && (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Prato</TableCell>
                <TableCell align="right">Preço</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pratosFiltrados.map((p) => (
                <TableRow key={p.prato_id} hover>
                  <TableCell>
                    <Chip label={p.prato_id} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{p.nome}</TableCell>
                  <TableCell align="right">
                    {formatarMoeda(p.preco_atual)}
                  </TableCell>
                </TableRow>
              ))}
              {pratosFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                    Nenhum prato encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
