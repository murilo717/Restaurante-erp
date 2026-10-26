import { api } from "@/api/client";
import type {
  CadastroIn,
  CadastroOut,
  CapacidadeCentro,
  Centro,
  Compra,
  FichaTecnica,
  Fornecedor,
  FornecedorCriar,
  Funcionario,
  FuncionarioCriar,
  Insumo,
  ItemKDS,
  Lote,
  Mesa,
  MesaAtualizar,
  MesaCriar,
  ModuloStatus,
  OrdemProducao,
  OrdemProducaoCriar,
  PagamentoIn,
  PedidoAbrir,
  PedidoDetalhe,
  PedidoResumo,
  Prato,
  StatusLote,
  StatusMesa,
  StatusOP,
  StatusPedido,
  StatusProducao,
  TokenResponse,
} from "@/api/types";

// POST /auth/login — OAuth2PasswordRequestForm espera form-urlencoded.
export async function login(
  username: string,
  password: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.append("username", username);
  body.append("password", password);
  const { data } = await api.post<TokenResponse>("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

// POST /auth/cadastro — cadastro público de usuário.
export async function cadastrar(dados: CadastroIn): Promise<CadastroOut> {
  const { data } = await api.post<CadastroOut>("/auth/cadastro", dados);
  return data;
}

// GET /crm/pratos
export async function listarPratos(): Promise<Prato[]> {
  const { data } = await api.get<Prato[]>("/crm/pratos");
  return data;
}

// --- Mesas (crm.mesas) ---

// GET /crm/mesas
export async function listarMesas(): Promise<Mesa[]> {
  const { data } = await api.get<Mesa[]>("/crm/mesas");
  return data;
}

// POST /crm/mesas
export async function criarMesa(dados: MesaCriar): Promise<Mesa> {
  const { data } = await api.post<Mesa>("/crm/mesas", dados);
  return data;
}

// PATCH /crm/mesas/{id}
export async function atualizarMesa(
  mesaId: number,
  dados: MesaAtualizar,
): Promise<Mesa> {
  const { data } = await api.patch<Mesa>(`/crm/mesas/${mesaId}`, dados);
  return data;
}

// PATCH /crm/mesas/{id}/status
export async function alterarStatusMesa(
  mesaId: number,
  status: StatusMesa,
): Promise<Mesa> {
  const { data } = await api.patch<Mesa>(`/crm/mesas/${mesaId}/status`, {
    status,
  });
  return data;
}

// --- Pedidos (crm.pedidos) ---

// GET /crm/pedidos
export async function listarPedidos(): Promise<PedidoResumo[]> {
  const { data } = await api.get<PedidoResumo[]>("/crm/pedidos");
  return data;
}

// GET /crm/pedidos/{id}
export async function verPedido(pedidoId: number): Promise<PedidoDetalhe> {
  const { data } = await api.get<PedidoDetalhe>(`/crm/pedidos/${pedidoId}`);
  return data;
}

// POST /crm/pedidos
export async function abrirPedido(dados: PedidoAbrir): Promise<PedidoDetalhe> {
  const { data } = await api.post<PedidoDetalhe>("/crm/pedidos", dados);
  return data;
}

// POST /crm/pedidos/{id}/itens
export async function adicionarItem(
  pedidoId: number,
  prato_id: number,
  quantidade: number,
): Promise<PedidoDetalhe> {
  const { data } = await api.post<PedidoDetalhe>(
    `/crm/pedidos/${pedidoId}/itens`,
    { prato_id, quantidade },
  );
  return data;
}

// DELETE /crm/pedidos/{id}/itens/{item_id}
export async function removerItem(
  pedidoId: number,
  itemId: number,
): Promise<PedidoDetalhe> {
  const { data } = await api.delete<PedidoDetalhe>(
    `/crm/pedidos/${pedidoId}/itens/${itemId}`,
  );
  return data;
}

// PATCH /crm/pedidos/{id}/status
export async function alterarStatusPedido(
  pedidoId: number,
  status: StatusPedido,
): Promise<PedidoDetalhe> {
  const { data } = await api.patch<PedidoDetalhe>(
    `/crm/pedidos/${pedidoId}/status`,
    { status },
  );
  return data;
}

// POST /financeiro/pagamentos
export async function registrarPagamento(
  pagamento: PagamentoIn,
): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(
    "/financeiro/pagamentos",
    pagamento,
  );
  return data;
}

// GET /{modulo}/status — módulos que ainda expõem apenas status.
export async function statusModulo(modulo: string): Promise<ModuloStatus> {
  const { data } = await api.get<ModuloStatus>(`/${modulo}/status`);
  return data;
}

// --- Funcionários (rh.funcionarios) ---

// GET /rh/funcionarios
export async function listarFuncionarios(): Promise<Funcionario[]> {
  const { data } = await api.get<Funcionario[]>("/rh/funcionarios");
  return data;
}

// POST /rh/funcionarios
export async function criarFuncionario(
  dados: FuncionarioCriar,
): Promise<Funcionario> {
  const { data } = await api.post<Funcionario>("/rh/funcionarios", dados);
  return data;
}

// POST /rh/funcionarios/{id}/vincular-usuario
export async function vincularUsuario(
  funcionarioId: number,
  login: string,
): Promise<{ mensagem: string }> {
  const { data } = await api.post<{ mensagem: string }>(
    `/rh/funcionarios/${funcionarioId}/vincular-usuario`,
    { login },
  );
  return data;
}

// =========================================================================
// KDS e Produção (módulo PP)
// =========================================================================

export async function listarKDS(): Promise<ItemKDS[]> {
  const { data } = await api.get<ItemKDS[]>("/pp/kds");
  return data;
}

export async function avancarStatusKDS(
  itemId: number,
  status: StatusProducao,
): Promise<ItemKDS> {
  const { data } = await api.patch<ItemKDS>(`/pp/kds/${itemId}`, {
    status_producao: status,
  });
  return data;
}

export async function listarCentros(): Promise<Centro[]> {
  const { data } = await api.get<Centro[]>("/pp/centros");
  return data;
}

export async function listarCapacidade(): Promise<CapacidadeCentro[]> {
  const { data } = await api.get<CapacidadeCentro[]>("/pp/capacidade");
  return data;
}

export async function listarOrdens(): Promise<OrdemProducao[]> {
  const { data } = await api.get<OrdemProducao[]>("/pp/ordens");
  return data;
}

export async function criarOrdem(
  dados: OrdemProducaoCriar,
): Promise<OrdemProducao> {
  const { data } = await api.post<OrdemProducao>("/pp/ordens", dados);
  return data;
}

export async function alterarStatusOrdem(
  opId: number,
  status: StatusOP,
): Promise<OrdemProducao> {
  const { data } = await api.patch<OrdemProducao>(`/pp/ordens/${opId}/status`, {
    status,
  });
  return data;
}

// =========================================================================
// Estoque / Materiais (módulo MM)
// =========================================================================

export async function listarInsumos(): Promise<Insumo[]> {
  const { data } = await api.get<Insumo[]>("/mm/insumos");
  return data;
}

export async function verFicha(pratoId: number): Promise<FichaTecnica> {
  const { data } = await api.get<FichaTecnica>(`/mm/pratos/${pratoId}/ficha`);
  return data;
}

export async function definirItemFicha(
  pratoId: number,
  insumo_id: number,
  quantidade_necessaria: number,
): Promise<FichaTecnica> {
  const { data } = await api.put<FichaTecnica>(
    `/mm/pratos/${pratoId}/ficha/itens`,
    { insumo_id, quantidade_necessaria },
  );
  return data;
}

export async function removerItemFicha(
  pratoId: number,
  insumoId: number,
): Promise<FichaTecnica> {
  const { data } = await api.delete<FichaTecnica>(
    `/mm/pratos/${pratoId}/ficha/itens/${insumoId}`,
  );
  return data;
}

export async function listarFornecedores(): Promise<Fornecedor[]> {
  const { data } = await api.get<Fornecedor[]>("/mm/fornecedores");
  return data;
}

export async function criarFornecedor(
  dados: FornecedorCriar,
): Promise<Fornecedor> {
  const { data } = await api.post<Fornecedor>("/mm/fornecedores", dados);
  return data;
}

export async function listarCompras(): Promise<Compra[]> {
  const { data } = await api.get<Compra[]>("/mm/compras");
  return data;
}

export async function criarCompra(fornecedor_id: number): Promise<Compra> {
  const { data } = await api.post<Compra>("/mm/compras", { fornecedor_id });
  return data;
}

export async function adicionarItemCompra(
  compraId: number,
  item: {
    insumo_id: number;
    quantidade: number;
    preco_unitario: number;
    validade?: string | null;
  },
): Promise<Compra> {
  const { data } = await api.post<Compra>(
    `/mm/compras/${compraId}/itens`,
    item,
  );
  return data;
}

export async function enviarCompra(compraId: number): Promise<Compra> {
  const { data } = await api.post<Compra>(`/mm/compras/${compraId}/enviar`);
  return data;
}

export async function receberCompra(compraId: number): Promise<Compra> {
  const { data } = await api.post<Compra>(`/mm/compras/${compraId}/receber`);
  return data;
}

export async function listarLotes(): Promise<Lote[]> {
  const { data } = await api.get<Lote[]>("/mm/lotes");
  return data;
}

export async function alterarStatusLote(
  loteId: number,
  status: StatusLote,
): Promise<Lote> {
  const { data } = await api.patch<Lote>(`/mm/lotes/${loteId}/status`, {
    status,
  });
  return data;
}

// =========================================================================
// BI / Dashboard
// =========================================================================

export async function obterDashboard(): Promise<
  import("@/api/types").DashboardExecutivo
> {
  const { data } = await api.get("/bi/dashboard");
  return data;
}

export async function obterPratosMaisVendidos(): Promise<
  import("@/api/types").PratoMaisVendido[]
> {
  const { data } = await api.get("/bi/pratos-mais-vendidos");
  return data;
}

export async function obterVendasDiarias(): Promise<
  import("@/api/types").VendaDiaria[]
> {
  const { data } = await api.get("/bi/vendas-diarias");
  return data;
}

export async function obterFunilVendas(): Promise<
  import("@/api/types").EtapaFunil[]
> {
  const { data } = await api.get("/bi/funil-vendas");
  return data;
}

// =========================================================================
// Financeiro (FI)
// =========================================================================

export async function listarContasPagar(): Promise<
  import("@/api/types").ContaPagar[]
> {
  const { data } = await api.get("/financeiro/contas-pagar");
  return data;
}

export async function criarContaPagar(
  dados: import("@/api/types").ContaPagarCriar,
): Promise<import("@/api/types").ContaPagar> {
  const { data } = await api.post("/financeiro/contas-pagar", dados);
  return data;
}

export async function pagarConta(
  cpId: number,
): Promise<import("@/api/types").ContaPagar> {
  const { data } = await api.patch(`/financeiro/contas-pagar/${cpId}/pagar`);
  return data;
}

export async function listarContasReceber(): Promise<
  import("@/api/types").ContaReceber[]
> {
  const { data } = await api.get("/financeiro/contas-receber");
  return data;
}

export async function criarContaReceber(
  dados: import("@/api/types").ContaReceberCriar,
): Promise<import("@/api/types").ContaReceber> {
  const { data } = await api.post("/financeiro/contas-receber", dados);
  return data;
}

export async function receberConta(
  crId: number,
): Promise<import("@/api/types").ContaReceber> {
  const { data } = await api.patch(`/financeiro/contas-receber/${crId}/receber`);
  return data;
}

export async function obterFluxoCaixa(): Promise<
  import("@/api/types").FluxoCaixaLinha[]
> {
  const { data } = await api.get("/financeiro/fluxo-caixa");
  return data;
}

export async function listarFechamentos(): Promise<
  import("@/api/types").FechamentoCaixa[]
> {
  const { data } = await api.get("/financeiro/fechamentos");
  return data;
}

export async function fecharCaixa(
  data_?: string | null,
): Promise<import("@/api/types").FechamentoCaixa> {
  const { data } = await api.post("/financeiro/fechamentos", {
    data: data_ ?? null,
  });
  return data;
}

// =========================================================================
// Clientes e Fidelidade (CRM)
// =========================================================================

export async function listarClientes(): Promise<
  import("@/api/types").Cliente[]
> {
  const { data } = await api.get("/crm/clientes");
  return data;
}

export async function criarCliente(
  dados: import("@/api/types").ClienteCriar,
): Promise<import("@/api/types").Cliente> {
  const { data } = await api.post("/crm/clientes", dados);
  return data;
}

export async function atualizarCliente(
  clienteId: number,
  dados: import("@/api/types").ClienteAtualizar,
): Promise<import("@/api/types").Cliente> {
  const { data } = await api.patch(`/crm/clientes/${clienteId}`, dados);
  return data;
}

export async function resgatarPontos(
  clienteId: number,
  pontos: number,
  motivo: string,
): Promise<{ pontos_fidelidade: number; mensagem: string }> {
  const { data } = await api.post(
    `/crm/clientes/${clienteId}/resgatar-pontos`,
    { pontos, motivo },
  );
  return data;
}

// =========================================================================
// RH: Ponto, Folha, Recrutamento
// =========================================================================

export async function listarPonto(): Promise<import("@/api/types").Ponto[]> {
  const { data } = await api.get("/rh/ponto");
  return data;
}

export async function baterEntrada(
  funcionario_id: number,
): Promise<import("@/api/types").Ponto> {
  const { data } = await api.post("/rh/ponto/entrada", { funcionario_id });
  return data;
}

export async function baterSaida(
  funcionario_id: number,
): Promise<import("@/api/types").Ponto> {
  const { data } = await api.post("/rh/ponto/saida", { funcionario_id });
  return data;
}

export async function listarFolha(): Promise<import("@/api/types").Folha[]> {
  const { data } = await api.get("/rh/folha");
  return data;
}

export async function gerarFolha(
  competencia?: string | null,
): Promise<import("@/api/types").Folha[]> {
  const { data } = await api.post("/rh/folha/gerar", {
    competencia: competencia ?? null,
  });
  return data;
}

export async function listarVagas(): Promise<import("@/api/types").Vaga[]> {
  const { data } = await api.get("/rh/vagas");
  return data;
}

export async function criarVaga(dados: {
  cargo: string;
  descricao?: string | null;
}): Promise<import("@/api/types").Vaga> {
  const { data } = await api.post("/rh/vagas", dados);
  return data;
}

export async function alterarStatusVaga(
  vagaId: number,
  status: import("@/api/types").StatusVaga,
): Promise<import("@/api/types").Vaga> {
  const { data } = await api.patch(`/rh/vagas/${vagaId}/status`, { status });
  return data;
}

export async function listarCandidatos(
  vagaId: number,
): Promise<import("@/api/types").Candidato[]> {
  const { data } = await api.get(`/rh/vagas/${vagaId}/candidatos`);
  return data;
}

export async function criarCandidato(
  vagaId: number,
  dados: { nome: string; email?: string | null },
): Promise<import("@/api/types").Candidato> {
  const { data } = await api.post(`/rh/vagas/${vagaId}/candidatos`, dados);
  return data;
}

export async function moverEtapaCandidato(
  candidatoId: number,
  etapa: import("@/api/types").EtapaCandidato,
): Promise<import("@/api/types").Candidato> {
  const { data } = await api.patch(`/rh/candidatos/${candidatoId}/etapa`, {
    etapa,
  });
  return data;
}
