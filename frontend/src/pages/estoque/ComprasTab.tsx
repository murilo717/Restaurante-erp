import { useState } from "react";
import {
  useMutation,
  useQueries,
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  adicionarItemCompra,
  criarCompra,
  criarFornecedor,
  enviarCompra,
  listarCompras,
  listarFornecedores,
  listarInsumos,
  receberCompra,
} from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type { Compra, StatusCompra } from "@/api/types";
import { formatarMoeda } from "@/utils/format";

const STATUS: Record<
  StatusCompra,
  { rotulo: string; cor: "default" | "info" | "success" | "error" }
> = {
  rascunho: { rotulo: "Rascunho", cor: "default" },
  enviado: { rotulo: "Enviado", cor: "info" },
  recebido: { rotulo: "Recebido", cor: "success" },
  cancelado: { rotulo: "Cancelado", cor: "error" },
};

export default function ComprasTab() {
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);

  // diálogos
  const [dlgFornecedor, setDlgFornecedor] = useState(false);
  const [formForn, setFormForn] = useState({
    razao_social: "",
    cnpj: "",
    contato: "",
  });
  const [novoFornecedorId, setNovoFornecedorId] = useState("");

  // adicionar item a uma compra selecionada
  const [compraItem, setCompraItem] = useState<Compra | null>(null);
  const [itemForm, setItemForm] = useState({
    insumo_id: "",
    quantidade: "",
    preco_unitario: "",
    validade: "",
  });

  const [compras, fornecedores, insumos] = useQueries({
    queries: [
      { queryKey: ["compras"], queryFn: listarCompras },
      { queryKey: ["fornecedores"], queryFn: listarFornecedores },
      { queryKey: ["insumos"], queryFn: listarInsumos },
    ],
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["compras"] });
    queryClient.invalidateQueries({ queryKey: ["insumos"] });
    queryClient.invalidateQueries({ queryKey: ["lotes"] });
  };

  const fornecedorMutation = useMutation({
    mutationFn: () =>
      criarFornecedor({
        razao_social: formForn.razao_social.trim(),
        cnpj: formForn.cnpj.replace(/\D/g, ""),
        contato: formForn.contato.trim() || null,
      }),
    onSuccess: () => {
      setDlgFornecedor(false);
      setFormForn({ razao_social: "", cnpj: "", contato: "" });
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  const novaCompraMutation = useMutation({
    mutationFn: () => criarCompra(Number(novoFornecedorId)),
    onSuccess: () => {
      setNovoFornecedorId("");
      invalidar();
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  const itemMutation = useMutation({
    mutationFn: () =>
      adicionarItemCompra(compraItem!.compra_id, {
        insumo_id: Number(itemForm.insumo_id),
        quantidade: Number(itemForm.quantidade),
        preco_unitario: Number(itemForm.preco_unitario),
        validade: itemForm.validade || null,
      }),
    onSuccess: () => {
      setCompraItem(null);
      setItemForm({ insumo_id: "", quantidade: "", preco_unitario: "", validade: "" });
      invalidar();
    },
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  const enviarMutation = useMutation({
    mutationFn: (id: number) => enviarCompra(id),
    onSuccess: invalidar,
    onError: (err) => setErro(extrairMensagemErro(err)),
  });

  const receberMutation = useMutation({
    mutationFn: (id: number) => receberCompra(id),
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

      {/* ação: nova compra + novo fornecedor */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        mb={2}
        alignItems={{ sm: "center" }}
      >
        <TextField
          select
          label="Fornecedor"
          size="small"
          value={novoFornecedorId}
          onChange={(e) => setNovoFornecedorId(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          {fornecedores.data?.map((f) => (
            <MenuItem key={f.fornecedor_id} value={f.fornecedor_id}>
              {f.razao_social}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!novoFornecedorId || novaCompraMutation.isPending}
          onClick={() => {
            setErro(null);
            novaCompraMutation.mutate();
          }}
        >
          Nova compra
        </Button>
        <Button onClick={() => setDlgFornecedor(true)}>+ Fornecedor</Button>
      </Stack>

      {compras.isLoading ? (
        <CircularProgress size={24} />
      ) : compras.data?.length === 0 ? (
        <Alert severity="info">
          Nenhuma compra. Escolha um fornecedor e clique em "Nova compra".
        </Alert>
      ) : (
        <Stack spacing={2}>
          {compras.data?.map((c) => (
            <Card key={c.compra_id} elevation={2}>
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography fontWeight={700}>
                    Compra #{c.compra_id} · {c.fornecedor_nome}
                  </Typography>
                  <Chip
                    label={STATUS[c.status].rotulo}
                    color={STATUS[c.status].cor}
                    size="small"
                  />
                </Stack>

                {c.itens.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Sem itens.
                  </Typography>
                ) : (
                  <Stack divider={<Divider />}>
                    {c.itens.map((it) => (
                      <Stack
                        key={it.item_compra_id}
                        direction="row"
                        justifyContent="space-between"
                        py={0.5}
                      >
                        <Typography variant="body2">
                          {it.quantidade}× {it.insumo_nome}
                          {it.validade ? ` (val. ${it.validade})` : ""}
                        </Typography>
                        <Typography variant="body2">
                          {formatarMoeda(it.preco_unitario)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}

                <Divider sx={{ my: 1 }} />
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography fontWeight={600}>
                    Total: {formatarMoeda(c.valor_total)}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {c.status === "rascunho" && (
                      <>
                        <Button
                          size="small"
                          onClick={() => {
                            setErro(null);
                            setCompraItem(c);
                          }}
                        >
                          Adicionar item
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={enviarMutation.isPending}
                          onClick={() => {
                            setErro(null);
                            enviarMutation.mutate(c.compra_id);
                          }}
                        >
                          Enviar
                        </Button>
                      </>
                    )}
                    {c.status === "enviado" && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={receberMutation.isPending}
                        onClick={() => {
                          setErro(null);
                          receberMutation.mutate(c.compra_id);
                        }}
                      >
                        Receber (dá entrada no estoque)
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Dialog novo fornecedor */}
      <Dialog
        open={dlgFornecedor}
        onClose={() => setDlgFornecedor(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Novo fornecedor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Razão social"
              value={formForn.razao_social}
              onChange={(e) =>
                setFormForn((f) => ({ ...f, razao_social: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="CNPJ (14 dígitos)"
              value={formForn.cnpj}
              onChange={(e) =>
                setFormForn((f) => ({ ...f, cnpj: e.target.value }))
              }
              fullWidth
              inputProps={{ maxLength: 18 }}
            />
            <TextField
              label="Contato (opcional)"
              value={formForn.contato}
              onChange={(e) =>
                setFormForn((f) => ({ ...f, contato: e.target.value }))
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlgFornecedor(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={
              !formForn.razao_social || !formForn.cnpj || fornecedorMutation.isPending
            }
            onClick={() => {
              setErro(null);
              fornecedorMutation.mutate();
            }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog adicionar item à compra */}
      <Dialog
        open={compraItem !== null}
        onClose={() => setCompraItem(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Adicionar item · Compra #{compraItem?.compra_id}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Insumo"
              value={itemForm.insumo_id}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, insumo_id: e.target.value }))
              }
              fullWidth
            >
              {insumos.data?.map((i) => (
                <MenuItem key={i.insumo_id} value={i.insumo_id}>
                  {i.nome} ({i.unidade_medida})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Quantidade"
              type="number"
              value={itemForm.quantidade}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, quantidade: e.target.value }))
              }
              fullWidth
              inputProps={{ min: 0, step: "0.001" }}
            />
            <TextField
              label="Preço unitário (R$)"
              type="number"
              value={itemForm.preco_unitario}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, preco_unitario: e.target.value }))
              }
              fullWidth
              inputProps={{ min: 0, step: "0.01" }}
            />
            <TextField
              label="Validade (opcional)"
              type="date"
              value={itemForm.validade}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, validade: e.target.value }))
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompraItem(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={
              !itemForm.insumo_id ||
              !itemForm.quantidade ||
              !itemForm.preco_unitario ||
              itemMutation.isPending
            }
            onClick={() => {
              setErro(null);
              itemMutation.mutate();
            }}
          >
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
