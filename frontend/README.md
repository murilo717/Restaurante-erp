# ERP Restaurante — Frontend

Interface web do ERP, construída com **React + TypeScript + Vite**, consumindo a API FastAPI do backend.

## Stack

- **React 18 + TypeScript + Vite** — base da aplicação
- **React Router** — navegação entre telas
- **TanStack Query** — busca e cache de dados da API
- **Axios** — requisições HTTP (com interceptor de token Bearer)
- **Material UI** — componentes de tabela, formulário e dashboard

## Pré-requisitos

- Node.js 18+ (recomendado 20+)
- Backend FastAPI em execução (por padrão em `http://localhost:8000`)

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de ambiente e ajuste a URL da API, se necessário:

   ```bash
   cp .env.example .env
   ```

   A variável `VITE_API_URL` deve apontar para o backend (ex.: `http://localhost:8000`).

3. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   A aplicação abre em `http://localhost:5173`.

## Build de produção

```bash
npm run build
npm run preview
```

## Integração com o backend

- **Login:** a rota `POST /auth/login` usa `OAuth2PasswordRequestForm`, então o front envia `username` e `password` como `x-www-form-urlencoded`. A resposta traz `access_token` (tipo `bearer`), armazenado no `localStorage` e enviado em `Authorization: Bearer <token>` nas demais chamadas.
- **CORS:** o backend libera `http://localhost:5173` e `http://127.0.0.1:5173` via `CORSMiddleware` (ver `app/main.py`). Em produção, adicione o domínio oficial do front-end nessa lista.
- **Perfis:** o menu e o acesso às telas respeitam os perfis contidos no JWT (`garcom`, `cozinha`, `supervisor`, `gerente`, `auditor`, `ceo`, `dba`). `ceo` e `dba` sempre têm acesso.

## Telas disponíveis

| Tela        | Endpoint                         | Perfis                                   |
| ----------- | -------------------------------- | ---------------------------------------- |
| Login       | `POST /auth/login`               | público                                  |
| Cadastro    | `POST /auth/cadastro`            | público                                  |
| Dashboard   | `GET /bi/dashboard`, `/bi/*` + status | indicadores: gerente/supervisor/auditor; status: todos |
| Mesas       | `GET/POST/PATCH /crm/mesas`      | ler: operação; criar/editar: gerente/supervisor |
| Pedidos     | `GET/POST/PATCH/DELETE /crm/pedidos` | garcom, cozinha, gerente, supervisor |
| Cozinha KDS | `GET/PATCH /pp/kds`              | cozinha, gerente, supervisor             |
| Produção    | `GET/POST/PATCH /pp/ordens`, `/pp/capacidade` | cozinha/supervisor; criar: gerente/supervisor |
| Estoque     | `/mm/insumos`, `/mm/pratos/{id}/ficha`, `/mm/compras`, `/mm/lotes` | ler: cozinha/gestão; editar: gerente/supervisor |
| Funcionários| `GET/POST /rh/funcionarios` + vínculo | gerente                             |
| Cardápio    | `GET /crm/pratos`                | garcom, cozinha, gerente, supervisor     |
| Pagamentos  | `POST /financeiro/pagamentos`    | garcom, gerente                          |
| Módulos     | `GET /{bi,mm,pp,rh}/status`      | autenticado                              |

Novas telas serão adicionadas conforme o backend ganhar endpoints.

## Cadastro e permissões

- O **cadastro público** (`POST /auth/cadastro`) cria o usuário no banco via `sys.fn_criar_usuario`, que gera o hash **bcrypt** (`crypt`/`pgcrypto`) — compatível com a validação de login (`sys.fn_autenticar`).
- Por segurança, todo cadastro recebe apenas o perfil inicial **`garcom`** (acesso básico). Ninguém pode se cadastrar como administrador.
- A elevação de perfis é feita por um gestor através de `POST /auth/usuarios/{id}/perfis` (restrito a `gerente`/`ceo`/`dba`). É assim que o administrador concede permissões aos funcionários.

## Pedidos (comandas do garçom)

O garçom abre um pedido (opcionalmente numa mesa, que passa a "ocupada"), anota os
pratos com quantidade e acompanha o preparo pelos status
(`aberto → em_preparo → entregue → pago`). O `valor_total` é recalculado no backend
a partir dos subtotais dos itens (o `subtotal` é coluna gerada no banco). Ao marcar
o pedido como `pago` ou `cancelado`, a mesa volta a "livre".

### Vínculo usuário → funcionário

O pedido registra o **funcionário vinculado ao usuário autenticado**. Esse vínculo
fica em `sys.usuarios.funcionario_id` (FK para `rh.funcionarios`) e é resolvido no
backend a cada requisição (dependency `funcionario_do_usuario` em
`app/core/security.py`), então vale imediatamente após ser criado — sem precisar
relogar.

Fluxo de setup (feito por um gestor na tela **Funcionários**):

1. Cadastrar o funcionário em RH (nome, CPF, cargo, salário).
2. Vincular o login do usuário a esse funcionário.

Se um usuário sem vínculo tentar abrir um pedido, a API responde `409` com uma
mensagem orientando procurar o gestor.

## Cozinha, Produção e Estoque

- **Cozinha (KDS):** painel em colunas (fila → preparando → pronto) que lê os
  itens de pedidos ativos e atualiza `crm.itens_pedido.status_producao`. Atualiza
  sozinho a cada 10s.
- **Produção (PP):** ordens de produção (`pp.ordens_producao`) com avanço de status
  (a trigger `pp.fn_op_status` preenche `iniciada_em`/`concluida_em`), e cartões de
  ocupação por centro consumindo a view `pp.vw_capacidade_centro`.
- **Estoque (MM):** abas de Insumos (com alerta de estoque abaixo do mínimo),
  Fichas Técnicas (prato → insumos, que habilitam a baixa automática no pagamento),
  Compras e Lotes.

### Fluxo de compra (MM)

`rascunho` → adicionar itens → `enviar` → `receber`. O recebimento chama a
procedure `mm.receber_compra` no banco, que **cria os lotes, dá entrada no estoque,
registra a movimentação e gera a conta a pagar** automaticamente. Lotes podem ser
`liberado` ou `bloqueado` (para barrar produto estragado).

> Para a baixa automática de estoque funcionar no pagamento de um pedido, o prato
> precisa ter ficha técnica cadastrada (a trigger `fi.fn_baixar_estoque_apos_pagamento`
> consome os insumos conforme a ficha). Centros de trabalho (`pp.centros_trabalho`)
> e insumos precisam existir no banco para as telas de Produção/Estoque mostrarem
> dados.

## Dashboard (BI)

Para perfis de gestão (`gerente`/`supervisor`/`auditor`), o Dashboard mostra
indicadores do negócio e gráficos (Recharts), consumindo as views de BI do banco:

- **Indicadores** (`bi.vw_dashboard_executivo`): faturamento do mês, insumos abaixo
  do mínimo, contas a pagar vencidas, manutenções vencidas.
- **Vendas por dia** (`bi.vw_vendas_diarias_prato`): linha temporal de unidades vendidas.
- **Pratos mais vendidos no mês** (`bi.vw_pratos_mais_vendidos_mes`): barras.

Usuários sem perfil de BI (ex.: garçom) veem apenas a seção de disponibilidade dos
módulos — a chamada aos indicadores nem é feita, evitando o `403`.