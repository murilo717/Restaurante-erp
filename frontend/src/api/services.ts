import { api } from "@/api/client";
import type {
  CadastroIn,
  CadastroOut,
  Mesa,
  MesaAtualizar,
  MesaCriar,
  ModuloStatus,
  PagamentoIn,
  Prato,
  StatusMesa,
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
