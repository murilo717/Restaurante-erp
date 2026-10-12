// Tipos alinhados aos schemas e respostas da API FastAPI.

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Payload do JWT emitido por app/core/security.py -> criar_token
export interface JwtPayload {
  sub: string;
  perfis: string[];
  exp: number;
}

export interface Prato {
  prato_id: number;
  nome: string;
  preco_atual: number;
}

export type FormaPagamento =
  | "dinheiro"
  | "debito"
  | "credito"
  | "pix"
  | "ifood";

// Espelha PagamentoIn em app/modules/fi/router.py
export interface PagamentoIn {
  pedido_id: number;
  pedido_data_abertura: string; // ISO datetime
  forma_pagamento: FormaPagamento;
  valor: number;
}

export interface ModuloStatus {
  modulo: string;
  status: string;
}

// Perfis definidos em app/core/security.py -> Perfil
export type Perfil =
  | "garcom"
  | "cozinha"
  | "supervisor"
  | "gerente"
  | "auditor"
  | "ceo"
  | "dba";

export interface Usuario {
  login: string;
  perfis: Perfil[];
}

// Espelha CadastroIn em app/modules/auth/schemas.py
export interface CadastroIn {
  nome: string;
  email: string;
  login: string;
  senha: string;
  confirmar_senha: string;
  telefone?: string | null;
}

export interface CadastroOut {
  usuario_id: number;
  login: string;
  nome: string;
  email: string;
  perfis: string[];
  mensagem: string;
}

// Mesas — espelha crm.mesas / app/modules/crm/schemas.py
export type StatusMesa = "livre" | "ocupada" | "reservada" | "manutencao";

export interface Mesa {
  mesa_id: number;
  numero: number;
  capacidade: number;
  status: StatusMesa;
}

export interface MesaCriar {
  numero: number;
  capacidade: number;
  status?: StatusMesa;
}

export interface MesaAtualizar {
  numero?: number;
  capacidade?: number;
  status?: StatusMesa;
}
