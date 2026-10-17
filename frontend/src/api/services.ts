import { api } from "@/api/client";
import type {
  CadastroIn,
  CadastroOut,
  Funcionario,
  FuncionarioCriar,
  Mesa,
  MesaAtualizar,
  MesaCriar,
  ModuloStatus,
  PagamentoIn,
  PedidoAbrir,
  PedidoDetalhe,
  PedidoResumo,
  Prato,
  StatusMesa,
  StatusPedido,
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
