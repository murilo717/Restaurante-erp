import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import { registrarPagamento } from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type { FormaPagamento } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";
import { paraInputDateTimeLocal } from "@/utils/format";

const FORMAS: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "debito", rotulo: "Débito" },
  { valor: "credito", rotulo: "Crédito" },
  { valor: "pix", rotulo: "Pix" },
  { valor: "ifood", rotulo: "iFood" },
];

export default function PagamentosPage() {
  const [pedidoId, setPedidoId] = useState("");
  const [dataAbertura, setDataAbertura] = useState(
    paraInputDateTimeLocal(new Date()),
  );
  const [forma, setForma] = useState<FormaPagamento>("dinheiro");
  const [valor, setValor] = useState("");

  const mutation = useMutation({
    mutationFn: registrarPagamento,
    onSuccess: () => {
      setPedidoId("");
      setValor("");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({
      pedido_id: Number(pedidoId),
      // datetime-local -> ISO para o backend
      pedido_data_abertura: new Date(dataAbertura).toISOString(),
      forma_pagamento: forma,
      valor: Number(valor),
    });
  }

  return (
    <Box>
      <PageHeader
        titulo="Registrar pagamento"
        descricao="Lança um pagamento para um pedido. O estoque é baixado automaticamente pelas triggers do banco."
      />

      <Card elevation={2} sx={{ maxWidth: 640 }}>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
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
                  label="ID do pedido"
                  type="number"
                  value={pedidoId}
                  onChange={(e) => setPedidoId(e.target.value)}
                  required
                  fullWidth
                  inputProps={{ min: 1 }}
                />
                <TextField
                  label="Valor (R$)"
                  type="number"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                  fullWidth
                  inputProps={{ min: 0, step: "0.01" }}
                />
                <TextField
                  label="Data de abertura do pedido"
                  type="datetime-local"
                  value={dataAbertura}
                  onChange={(e) => setDataAbertura(e.target.value)}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Forma de pagamento"
                  select
                  value={forma}
                  onChange={(e) => setForma(e.target.value as FormaPagamento)}
                  required
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
                  disabled={mutation.isPending}
                  startIcon={
                    mutation.isPending ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <PaymentsIcon />
                    )
                  }
                >
                  {mutation.isPending ? "Registrando..." : "Registrar pagamento"}
                </Button>
              </Box>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
