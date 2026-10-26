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
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { gerarFolha, listarFolha } from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import { formatarMoeda } from "@/utils/format";

export default function FolhaTab() {
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  // mês de competência no formato YYYY-MM
  const hoje = new Date();
  const [competencia, setCompetencia] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`,
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["folha"],
    queryFn: listarFolha,
  });

  const mutation = useMutation({
    mutationFn: () => gerarFolha(`${competencia}-01`),
    onSuccess: (folhas) => {
      setSucesso(`Folha gerada: ${folhas.length} funcionário(s) na competência.`);
      queryClient.invalidateQueries({ queryKey: ["folha"] });
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  return (
    <Box>
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

      <Paper elevation={2} sx={{ p: 2, mb: 3, maxWidth: 520 }}>
        <Typography variant="h6" fontWeight={700} mb={1}>
          Gerar folha
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Gera a folha de todos os funcionários ativos para a competência
          escolhida. Reexecutar não duplica folhas já geradas.
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            label="Competência"
            type="month"
            size="small"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            startIcon={<ReceiptLongIcon />}
            disabled={!competencia || mutation.isPending}
            onClick={() => {
              setErro(null);
              setSucesso(null);
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "Gerando..." : "Gerar folha"}
          </Button>
        </Stack>
      </Paper>

      {isLoading ? (
        <CircularProgress size={24} />
      ) : isError ? (
        <Alert severity="error">{extrairMensagemErro(error)}</Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Competência</TableCell>
                <TableCell>Funcionário</TableCell>
                <TableCell align="right">Bruto</TableCell>
                <TableCell align="right">INSS</TableCell>
                <TableCell align="right">IRRF</TableCell>
                <TableCell align="right">Benefícios</TableCell>
                <TableCell align="right">Líquido</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.map((f) => (
                <TableRow key={f.folha_id} hover>
                  <TableCell>{f.competencia}</TableCell>
                  <TableCell>{f.funcionario_nome}</TableCell>
                  <TableCell align="right">{formatarMoeda(f.salario_bruto)}</TableCell>
                  <TableCell align="right">{formatarMoeda(f.desconto_inss)}</TableCell>
                  <TableCell align="right">{formatarMoeda(f.desconto_irrf)}</TableCell>
                  <TableCell align="right">
                    {formatarMoeda(f.desconto_beneficios)}
                  </TableCell>
                  <TableCell align="right">
                    <strong>{formatarMoeda(f.salario_liquido)}</strong>
                  </TableCell>
                </TableRow>
              ))}
              {data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    Nenhuma folha gerada.
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
