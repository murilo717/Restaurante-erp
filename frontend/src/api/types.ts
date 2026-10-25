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

// Pedidos — espelha crm.pedidos / crm.itens_pedido
export type StatusPedido =
  | "aberto"
  | "em_preparo"
  | "entregue"
  | "pago"
  | "cancelado";

export type CanalPedido = "salao" | "delivery" | "qrcode";

export interface ItemPedido {
  item_id: number;
  prato_id: number;
  prato_nome: string;
  quantidade: number;
  preco_unitario_registrado: number;
  subtotal: number;
  status_producao: string;
}

export interface PedidoResumo {
  pedido_id: number;
  data_abertura: string;
  mesa_id: number | null;
  mesa_numero: number | null;
  canal: CanalPedido;
  status: StatusPedido;
  valor_total: number;
  qtd_itens: number;
}

export interface PedidoDetalhe {
  pedido_id: number;
  data_abertura: string;
  mesa_id: number | null;
  mesa_numero: number | null;
  canal: CanalPedido;
  status: StatusPedido;
  valor_total: number;
  itens: ItemPedido[];
}

export interface PedidoAbrir {
  mesa_id?: number | null;
  canal?: CanalPedido;
}

// Funcionários — espelha rh.funcionarios / app/modules/rh/schemas.py
export type CargoFuncionario = "garcom" | "cozinha" | "gerente" | "ceo" | "dba";

export interface Funcionario {
  funcionario_id: number;
  nome: string;
  cpf: string;
  cargo: CargoFuncionario;
  salario: number;
  data_admissao: string;
  ativo: boolean;
  usuario_login: string | null;
}

export interface FuncionarioCriar {
  nome: string;
  cpf: string;
  cargo: CargoFuncionario;
  salario: number;
}

// --- KDS (crm.itens_pedido.status_producao) ---
export type StatusProducao = "fila" | "preparando" | "pronto" | "entregue";

export interface ItemKDS {
  item_id: number;
  pedido_id: number;
  mesa_numero: number | null;
  canal: string;
  prato_nome: string;
  quantidade: number;
  status_producao: StatusProducao;
  pedido_status: string;
  data_abertura: string;
}

// --- Ordens de Produção (pp) ---
export type StatusOP =
  | "planejada"
  | "em_andamento"
  | "concluida"
  | "cancelada";

export interface Centro {
  centro_id: number;
  nome: string;
  capacidade_porcoes_hora: number;
}

export interface OrdemProducao {
  op_id: number;
  prato_id: number;
  prato_nome: string;
  centro_id: number;
  centro_nome: string;
  quantidade: number;
  status: StatusOP;
  data_prevista: string;
  iniciada_em: string | null;
  concluida_em: string | null;
}

export interface OrdemProducaoCriar {
  prato_id: number;
  centro_id: number;
  quantidade: number;
  data_prevista?: string | null;
}

export interface CapacidadeCentro {
  centro_id: number;
  centro: string;
  data_prevista: string;
  porcoes_planejadas: number;
  capacidade_dia: number;
  ocupacao_pct: number;
}

// --- MM: Insumos, Ficha Técnica, Fornecedores, Compras, Lotes ---
export interface Insumo {
  insumo_id: number;
  nome: string;
  unidade_medida: string;
  quantidade_estoque: number;
  estoque_minimo: number;
  data_validade: string | null;
  perecivel: boolean;
  abaixo_minimo: boolean;
}

export interface FichaItem {
  insumo_id: number;
  insumo_nome: string;
  unidade_medida: string;
  quantidade_necessaria: number;
}

export interface FichaTecnica {
  prato_id: number;
  prato_nome: string;
  itens: FichaItem[];
}

export interface Fornecedor {
  fornecedor_id: number;
  razao_social: string;
  cnpj: string;
  contato: string | null;
  ativo: boolean;
}

export interface FornecedorCriar {
  razao_social: string;
  cnpj: string;
  contato?: string | null;
}

export type StatusCompra = "rascunho" | "enviado" | "recebido" | "cancelado";

export interface ItemCompra {
  item_compra_id: number;
  insumo_id: number;
  insumo_nome: string;
  quantidade: number;
  preco_unitario: number;
  validade: string | null;
}

export interface Compra {
  compra_id: number;
  fornecedor_id: number;
  fornecedor_nome: string;
  status: StatusCompra;
  criado_em: string;
  recebido_em: string | null;
  valor_total: number;
  itens: ItemCompra[];
}

export type StatusLote = "em_inspecao" | "liberado" | "bloqueado";

export interface Lote {
  lote_id: number;
  insumo_id: number;
  insumo_nome: string;
  codigo_lote: string;
  quantidade_inicial: number;
  validade: string | null;
  status: StatusLote;
}

// --- BI / Dashboard ---
export interface DashboardExecutivo {
  faturamento_mes: number;
  insumos_abaixo_minimo: number;
  os_abertas: number;
  ncs_abertas: number;
  riscos_criticos: number;
  manutencoes_vencidas: number;
  contas_pagar_vencidas: number;
}

export interface PratoMaisVendido {
  mes_referencia: string;
  prato_id: number;
  prato: string;
  categoria: string;
  quantidade_vendida: number;
  receita_total: number;
}

export interface VendaDiaria {
  dia: string;
  prato_id: number;
  quantidade: number;
}

export interface EtapaFunil {
  etapa: string;
  qtd: number;
  valor_total: number;
  valor_ponderado: number;
}
