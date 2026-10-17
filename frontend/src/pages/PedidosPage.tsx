import { useMemo, useState } from "react";
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
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  abrirPedido,
  adicionarItem,
  alterarStatusPedido,
  listarMesas,
  listarPedidos,
  listarPratos,
  removerItem,
  verPedido,
} from "@/api/services";
import { extrairMensagemErro } from "@/api/client";
import type { CanalPedido, StatusPedido } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";
import { formatarMoeda } from "@/utils/format";

const STATUS_PEDIDO: Record<
  StatusPedido,
  { rotulo: string; cor: "default" | "info" | "warning" | "success" | "error" }
> = {
  aberto: { rotulo: "Aberto", cor: "info" },
  em_preparo: { rotulo: "Em preparo", cor: "warning" },
  entregue: { rotulo: "Entregue", cor: "default" },
  pago: { rotulo: "Pago", cor: "success" },
  cancelado: { rotulo: "Cancelado", cor: "error" },
};

// Transições de status que o garçom pode acionar a partir do estado atual.
const PROXIMOS_STATUS: Record<StatusPedido, StatusPedido[]> = {
  aberto: ["em_preparo", "cancelado"],
  em_preparo: ["entregue", "cancelado"],
  entregue: ["pago", "cancelado"],
  pago: [],
  cancelado: [],
};

export default function PedidosPage() {
  const queryClient = useQueryClient();
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [mesaNova, setMesaNova] = useState<string>("");
  const [canalNovo, setCanalNovo] = useState<CanalPedido>("salao");
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  // adicionar item
  const [pratoSel, setPratoSel] = useState<string>("");
  const [qtd, setQtd] = useState("1");

  const pedidosQuery = useQuery({
    queryKey: ["pedidos"],
    queryFn: listarPedidos,
  });

  const mesasQuery = useQuery({ queryKey: ["mesas"], queryFn: listarMesas });
  const pratosQuery = useQuery({ queryKey: ["pratos"], queryFn: listarPratos });

  const detalheQuery = useQuery({
    queryKey: ["pedido", selecionado],
    queryFn: () => verPedido(selecionado as number),
    enabled: selecionado !== null,
  });

  const invalidarTudo = () => {
    queryClient.invalidateQueries({ queryKey: ["pedidos"] });
    queryClient.invalidateQueries({ queryKey: ["mesas"] });
    if (selecionado !== null) {
      queryClient.invalidateQueries({ queryKey: ["pedido", selecionado] });
    }
  };

  const abrirMutation = useMutation({
    mutationFn: () =>
      abrirPedido({
        mesa_id: mesaNova ? Number(mesaNova) : null,
        canal: canalNovo,
      }),
    onSuccess: (pedido) => {
      setDialogAberto(false);
      setMesaNova("");
      setCanalNovo("salao");
      setSelecionado(pedido.pedido_id);
      invalidarTudo();
    },
    onError: (err) => setErroAcao(extrairMensagemErro(err)),
  });

  const itemMutation = useMutation({
    mutationFn: () =>
      adicionarItem(selecionado as number, Number(pratoSel), Number(qtd)),
    onSuccess: () => {
      setPratoSel("");
      setQtd("1");
      invalidarTudo();
    },
    onError: (err) => setErroAcao(extrairMensagemErro(err)),
  });

  const removerMutation = useMutation({
    mutationFn: (itemId: number) => removerItem(selecionado as number, itemId),
    onSuccess: invalidarTudo,
    onError: (err) => setErroAcao(extrairMensagemErro(err)),
  });

  const statusMutation = useMutation({
    mutationFn: (status: StatusPedido) =>
      alterarStatusPedido(selecionado as number, status),
    onSuccess: invalidarTudo,
    onError: (err) => setErroAcao(extrairMensagemErro(err)),
  });

  const mesasLivres = useMemo(
    () => mesasQuery.data?.filter((m) => m.status === "livre") ?? [],
    [mesasQuery.data],
  );

  const detalhe = detalheQuery.data;

  return (
    <Box>
      <PageHeader
        titulo="Pedidos"
        descricao="Abra uma comanda, anote os pratos da mesa e acompanhe o preparo."
        acao={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setErroAcao(null);
              setDialogAberto(true);
            }}
          >
            Novo pedido
          </Button>
        }
      />

      {erroAcao && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErroAcao(null)}>
          {erroAcao}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
          alignItems: "start",
        }}
      >
        {/* Lista de pedidos */}
        <Stack spacing={1.5}>
          {pedidosQuery.isLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {pedidosQuery.isError && (
            <Alert severity="error">
              {extrairMensagemErro(pedidosQuery.error)}
            </Alert>
          )}
          {pedidosQuery.data?.length === 0 && (
            <Alert severity="info">
              Nenhum pedido ainda. Clique em "Novo pedido".
            </Alert>
          )}
          {pedidosQuery.data?.map((p) => {
            const info = STATUS_PEDIDO[p.status];
            return (
              <Card
                key={p.pedido_id}
                elevation={selecionado === p.pedido_id ? 6 : 1}
                sx={{
                  borderLeft: 4,
                  borderColor: `${info.cor}.main`,
                }}
              >
                <CardActionArea onClick={() => setSelecionado(p.pedido_id)}>
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography fontWeight={700}>
                        Pedido #{p.pedido_id}
                      </Typography>
                      <Chip label={info.rotulo} color={info.cor} size="small" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {p.mesa_numero ? `Mesa ${p.mesa_numero}` : p.canal} ·{" "}
                      {p.qtd_itens} {p.qtd_itens === 1 ? "item" : "itens"}
                    </Typography>
                    <Typography variant="subtitle2" mt={0.5}>
                      {formatarMoeda(p.valor_total)}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>

        {/* Detalhe do pedido */}
        <Card elevation={2} sx={{ minHeight: 320 }}>
          <CardContent>
            {selecionado === null && (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{ py: 8, color: "text.secondary" }}
                spacing={1}
              >
                <ReceiptLongIcon sx={{ fontSize: 48 }} />
                <Typography>
                  Selecione um pedido ou crie um novo para anotar os itens.
                </Typography>
              </Stack>
            )}

            {detalheQuery.isLoading && selecionado !== null && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            )}

            {detalhe && (
              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography variant="h6" fontWeight={700}>
                    Pedido #{detalhe.pedido_id}
                    {detalhe.mesa_numero
                      ? ` · Mesa ${detalhe.mesa_numero}`
                      : ` · ${detalhe.canal}`}
                  </Typography>
                  <Chip
                    label={STATUS_PEDIDO[detalhe.status].rotulo}
                    color={STATUS_PEDIDO[detalhe.status].cor}
                  />
                </Stack>

                {/* Form de adicionar item (só se o pedido aceita itens) */}
                {detalhe.status !== "pago" &&
                  detalhe.status !== "cancelado" && (
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      mb={2}
                      alignItems={{ sm: "center" }}
                    >
                      <TextField
                        select
                        label="Prato"
                        size="small"
                        value={pratoSel}
                        onChange={(e) => setPratoSel(e.target.value)}
                        sx={{ minWidth: 220 }}
                      >
                        {pratosQuery.data?.map((pr) => (
                          <MenuItem key={pr.prato_id} value={pr.prato_id}>
                            {pr.nome} — {formatarMoeda(pr.preco_atual)}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        label="Qtd"
                        type="number"
                        size="small"
                        value={qtd}
                        onChange={(e) => setQtd(e.target.value)}
                        inputProps={{ min: 1 }}
                        sx={{ width: 90 }}
                      />
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        disabled={!pratoSel || itemMutation.isPending}
                        onClick={() => {
                          setErroAcao(null);
                          itemMutation.mutate();
                        }}
                      >
                        Adicionar
                      </Button>
                    </Stack>
                  )}

                <Divider sx={{ mb: 1 }} />

                {/* Itens */}
                {detalhe.itens.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    Nenhum item anotado ainda.
                  </Typography>
                ) : (
                  <Stack divider={<Divider />}>
                    {detalhe.itens.map((item) => (
                      <Stack
                        key={item.item_id}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        py={1}
                      >
                        <Box>
                          <Typography>
                            {item.quantidade}× {item.prato_nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatarMoeda(item.preco_unitario_registrado)} cada
                            · {item.status_producao}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={600}>
                            {formatarMoeda(item.subtotal)}
                          </Typography>
                          {detalhe.status !== "pago" &&
                            detalhe.status !== "cancelado" && (
                              <IconButton
                                size="small"
                                color="error"
                                disabled={removerMutation.isPending}
                                onClick={() =>
                                  removerMutation.mutate(item.item_id)
                                }
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            )}
                        </Stack>
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
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {formatarMoeda(detalhe.valor_total)}
                  </Typography>
                </Stack>

                {/* Ações de status */}
                {PROXIMOS_STATUS[detalhe.status].length > 0 && (
                  <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
                    {PROXIMOS_STATUS[detalhe.status].map((s) => (
                      <Button
                        key={s}
                        variant={s === "cancelado" ? "outlined" : "contained"}
                        color={s === "cancelado" ? "error" : "primary"}
                        disabled={statusMutation.isPending}
                        onClick={() => {
                          setErroAcao(null);
                          statusMutation.mutate(s);
                        }}
                      >
                        {STATUS_PEDIDO[s].rotulo}
                      </Button>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Dialog novo pedido */}
      <Dialog
        open={dialogAberto}
        onClose={() => setDialogAberto(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Novo pedido</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Canal"
              value={canalNovo}
              onChange={(e) => setCanalNovo(e.target.value as CanalPedido)}
              fullWidth
            >
              <MenuItem value="salao">Salão</MenuItem>
              <MenuItem value="delivery">Delivery</MenuItem>
              <MenuItem value="qrcode">QR Code</MenuItem>
            </TextField>

            {canalNovo === "salao" && (
              <TextField
                select
                label="Mesa"
                value={mesaNova}
                onChange={(e) => setMesaNova(e.target.value)}
                fullWidth
                helperText={
                  mesasLivres.length === 0
                    ? "Nenhuma mesa livre no momento."
                    : "Apenas mesas livres aparecem aqui."
                }
              >
                {mesasLivres.map((m) => (
                  <MenuItem key={m.mesa_id} value={m.mesa_id}>
                    Mesa {m.numero} ({m.capacidade} lugares)
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAberto(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => {
              setErroAcao(null);
              abrirMutation.mutate();
            }}
            disabled={abrirMutation.isPending}
          >
            {abrirMutation.isPending ? "Abrindo..." : "Abrir pedido"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
