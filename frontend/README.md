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
| Dashboard   | `GET /{bi,mm,pp,rh}/status`      | autenticado                              |
| Mesas       | `GET/POST/PATCH /crm/mesas`      | ler: operação; criar/editar: gerente/supervisor |
| Pedidos     | `GET/POST/PATCH/DELETE /crm/pedidos` | garcom, cozinha, gerente, supervisor |
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
