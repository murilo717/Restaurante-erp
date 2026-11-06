import { useState, type FormEvent, type KeyboardEvent } from "react";
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
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import SearchIcon from "@mui/icons-material/Search";
import {
  obterResumoPedidoPagamento,
  registrarPagamento,
} from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type { FormaPagamento } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";
import { formatarMoeda } from "@/utils/format";

const FORMAS: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "debito", rotulo: "Débito" },
  { valor: "credito", rotulo: "Crédito" },
  { valor: "pix", rotulo: "Pix" },
  { valor: "ifood", rotulo: "iFood" },
];

export default function PagamentosPage() {
  const queryClient = useQueryClient();
  const [pedidoIdInput, setPedidoIdInput] = useState("");
  // ID efetivamente consultado (só muda ao clicar em Buscar / Enter).
  const [idBusca, setIdBusca] = useState<number | null>(null);
  const [forma, setForma] = useState<FormaPagamento>("dinheiro");

  const resumoQuery = useQuery({
    queryKey: ["pagamento-resumo", idBusca],
    queryFn: () => obterResumoPedidoPagamento(idBusca as number),
    enabled: idBusca !== null,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: registrarPagamento,
    onSuccess: () => {
      // Atualiza o resumo: o saldo passa a refletir o pagamento feito.
      queryClient.invalidateQueries({ queryKey: ["pagamento-resumo", idBusca] });
      queryClient.invalidateQueries({ queryKey: ["fluxo-caixa"] });
    },
  });

  function buscar() {
    const id = Number(pedidoIdInput);
    if (!Number.isInteger(id) || id <= 0) return;
    mutation.reset();
    setIdBusca(id);
  }

  function aoTeclar(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      buscar();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resumoQuery.data) return;
    // Só o ID e a forma: a data de abertura e o valor vêm do pedido, no backend.
    mutation.mutate({
      pedido_id: resumoQuery.data.pedido_id,
      forma_pagamento: forma,
    });
  }

  const resumo = resumoQuery.data;
  const cancelado = resumo?.status === "cancelado";
  const quitado = resumo ? resumo.saldo <= 0 : false;
  const semValor = resumo ? resumo.valor_total <= 0 : false;
  const podePagar = !!resumo && !cancelado && !quitado && !semValor;

  return (
    <Box>
      <PageHeader
        titulo="Registrar pagamento"
        descricao="Informe o ID do pedido. O sistema busca o pedido e preenche o valor a pagar automaticamente."
      />

      <Card elevation={2} sx={{ maxWidth: 640 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <TextField
                label="ID do pedido"
                type="number"
                value={pedidoIdInput}
                onChange={(e) => setPedidoIdInput(e.target.value)}
                onKeyDown={aoTeclar}
                fullWidth
                autoFocus
                inputProps={{ min: 1 }}
              />
              <Button
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={buscar}
                disabled={!pedidoIdInput || resumoQuery.isFetching}
                sx={{ height: 56, whiteSpace: "nowrap" }}
              >
                Buscar
              </Button>
            </Stack>

            {resumoQuery.isFetching && !resumo && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {resumoQuery.isError && (
              <Alert severity="error">
                {extrairMensagemErro(resumoQuery.error)}
              </Alert>
            )}

            {resumo && (
              <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <Divider />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Pedido #{resumo.pedido_id}
                        {resumo.mesa_numero
                          ? ` · Mesa ${resumo.mesa_numero}`
                          : ""}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {resumo.qtd_itens}{" "}
                        {resumo.qtd_itens === 1 ? "item" : "itens"}
                        {resumo.cliente_nome
                          ? ` · Cliente: ${resumo.cliente_nome}`
                          : ""}
                      </Typography>
                    </Box>
                    <Chip
                      label={resumo.status.replace("_", " ")}
                      size="small"
                      color={cancelado ? "error" : "default"}
                      sx={{ textTransform: "capitalize" }}
                    />
                  </Stack>

                  <Stack spacing={0.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Total do pedido</Typography>
                      <Typography>{formatarMoeda(resumo.valor_total)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Já pago</Typography>
                      <Typography>{formatarMoeda(resumo.total_pago)}</Typography>
                    </Stack>
                  </Stack>

                  {cancelado && (
                    <Alert severity="error">
                      Pedido cancelado: não aceita pagamento.
                    </Alert>
                  )}
                  {semValor && !cancelado && (
                    <Alert severity="warning">
                      Pedido sem itens: adicione itens antes de pagar.
                    </Alert>
                  )}
                  {quitado && !cancelado && !semValor && (
                    <Alert severity="success">Este pedido já está quitado.</Alert>
                  )}

                  {mutation.isError && (
                    <Alert severity="error">
                      {extrairMensagemErro(mutation.error)}
                    </Alert>
                  )}
                  {mutation.isSuccess && (
                    <Alert severity="success">{mutation.data.status}</Alert>
                  )}

                  <Box
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    }}
                  >
                    <TextField
                      label="Valor a pagar"
                      value={formatarMoeda(Math.max(resumo.saldo, 0))}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      helperText="Preenchido automaticamente com o saldo do pedido"
                    />
                    <TextField
                      label="Forma de pagamento"
                      select
                      value={forma}
                      onChange={(e) => setForma(e.target.value as FormaPagamento)}
                      fullWidth
                    >
                      {FORMAS.map((f) => (
                        <MenuItem key={f.valor} value={f.valor}>
                          {f.rotulo}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <Box>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={!podePagar || mutation.isPending}
                      startIcon={
                        mutation.isPending ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <PaymentsIcon />
                        )
                      }
                    >
                      {mutation.isPending
                        ? "Registrando..."
                        : `Registrar pagamento de ${formatarMoeda(
                            Math.max(resumo.saldo, 0),
                          )}`}
                    </Button>
                  </Box>
                </Stack>
              </form>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
