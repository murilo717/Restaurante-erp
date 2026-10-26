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
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import { fecharCaixa, listarFechamentos } from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import { formatarMoeda } from "@/utils/format";
import { paraInputDateTimeLocal } from "@/utils/format";

export default function FechamentoTab() {
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  // data padrão = hoje (YYYY-MM-DD)
  const [dataRef, setDataRef] = useState(
    paraInputDateTimeLocal(new Date()).slice(0, 10),
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["fechamentos"],
    queryFn: listarFechamentos,
  });

  const mutation = useMutation({
    mutationFn: () => fecharCaixa(dataRef || null),
    onSuccess: (f) => {
      setSucesso(
        `Caixa de ${f.data_referencia} fechado: ${formatarMoeda(
          f.total_vendas,
        )} em ${f.qtd_pedidos} pedido(s).`,
      );
      queryClient.invalidateQueries({ queryKey: ["fechamentos"] });
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
          Fechar caixa do dia
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Consolida os pagamentos confirmados da data escolhida (totais por forma
          de pagamento e quantidade de pedidos). Pode ser reexecutado — atualiza o
          fechamento existente.
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            label="Data"
            type="date"
            size="small"
            value={dataRef}
            onChange={(e) => setDataRef(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            startIcon={<PointOfSaleIcon />}
            disabled={mutation.isPending}
            onClick={() => {
              setErro(null);
              setSucesso(null);
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "Fechando..." : "Fechar caixa"}
          </Button>
        </Stack>
      </Paper>

      <Typography variant="h6" fontWeight={700} mb={1}>
        Fechamentos anteriores
      </Typography>
      {isLoading ? (
        <CircularProgress size={24} />
      ) : isError ? (
        <Alert severity="error">{extrairMensagemErro(error)}</Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell align="right">Vendas</TableCell>
                <TableCell align="right">Dinheiro</TableCell>
                <TableCell align="right">Cartão</TableCell>
                <TableCell align="right">Pix</TableCell>
                <TableCell align="right">Pedidos</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.map((f) => (
                <TableRow key={f.fechamento_id} hover>
                  <TableCell>{f.data_referencia}</TableCell>
                  <TableCell align="right">
                    {formatarMoeda(f.total_vendas)}
                  </TableCell>
                  <TableCell align="right">
                    {formatarMoeda(f.total_dinheiro)}
                  </TableCell>
                  <TableCell align="right">
                    {formatarMoeda(f.total_cartao)}
                  </TableCell>
                  <TableCell align="right">
                    {formatarMoeda(f.total_pix)}
                  </TableCell>
                  <TableCell align="right">{f.qtd_pedidos}</TableCell>
                </TableRow>
              ))}
              {data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    Nenhum fechamento registrado.
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
