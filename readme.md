# TCC — Plataforma de Home Care (Backend + Web Admin + Mobile)

Sistema para **agendamento e acompanhamento de atendimentos domiciliares** (home care), composto por:
- **Backend (Node.js + Express + EJS)**: API REST, autenticação por sessão e painel administrativo (EJS).
- **Web Admin (EJS)**: gestão de pacientes, profissionais, agenda e relatórios (MVP).
- **App Mobile (Flutter)**: área do paciente (login, home, minha agenda). Futuro: área do profissional.

> **Escopo atual**: Sem módulo de logística/rotas. Foco em autenticação, agenda, perfis e base de relatórios.  
> **Última atualização**: 07/10/2025 (America/Sao_Paulo)

---

## 📚 Sumário
- [Arquitetura](#-arquitetura)
- [Estrutura do repositório](#-estrutura-do-repositório)
- [Funcionalidades (MVP)](#-funcionalidades-mvp)
- [Tecnologias](#-tecnologias)
- [Requisitos](#-requisitos)
- [Como executar (TL;DR)](#-como-executar-tldr)
- [Configuração do Backend](#-configuração-do-backend)
  - [.env.example](#envexample)
  - [Scripts (packagejson)](#-scripts-packagejson)
- [Web Admin (EJS)](#️-web-admin-ejs)
- [App Mobile (Flutter)](#-app-mobile-flutter)
  - [Configurar API_BASE_URL (constantsdart)](#configurar-api_base_url-constantsdart)
  - [Comandos úteis Flutter](#comandos-úteis-flutter)
- [API — Endpoints (guia)](#-api--endpoints-guia)
- [Relatórios (desenho atual)](#-relatórios-desenho-atual)
- [Segurança e Acesso](#-segurança-e-acesso)
- [Boas práticas & Performance](#-boas-práticas--performance)
- [Troubleshooting (erros comuns)](#-troubleshooting-erros-comuns)
- [Roadmap curto](#-roadmap-curto)
- [Licença](#-licença)
- [Suporte](#-suporte)

---

## 🧩 Arquitetura

[Mobile Flutter] ──> [API Express + Sessão + Views EJS] ──> [Banco de Dados]
↑ │
└────────(Assets /public, Uploads ./uploads)────────┘

markdown
Copiar código

- Uma app **Express** serve:
  - **API REST** (`/api/...`)
  - **Views EJS** (painel admin: `/auth/login`, `/admin`, etc.)
  - **Arquivos estáticos** em `/public`
  - **Uploads** em `./uploads`

---

## 🧱 Estrutura do repositório

.
├── backend/ # API + Web Admin (EJS)
│ ├── src/
│ │ ├── server.js # Express (Helmet, sessão, estáticos, EJS)
│ │ ├── routes/
│ │ │ ├── auth.routes.js
│ │ │ └── admin.routes.js
│ │ ├── views/ # Páginas EJS
│ │ ├── config/
│ │ │ └── permissions.js # RBAC (ROLE_PERMISSIONS, roleHas)
│ │ └── ...
│ ├── public/ # CSS/JS/Imagens (estáticos)
│ ├── uploads/ # Uploads (criar se não existir)
│ ├── package.json
│ └── .env.example
└── mobile/
└── home_care_paciente/
├── lib/
│ ├── core/
│ │ ├── colors.dart
│ │ └── constants.dart # API_BASE_URL
│ ├── screens/
│ │ ├── login_screen.dart
│ │ ├── home_screen.dart
│ │ └── minha_agenda_screen.dart
│ └── widgets/
├── pubspec.yaml
└── android/ ios/

yaml
Copiar código

---

## ✨ Funcionalidades (MVP)

- Autenticação por **sessão** (backend).
- **RBAC** (perfis/papéis) via `permissions.js`.
- Gestão: **pacientes**, **profissionais**, **agendamentos**.
- **Agenda** com status: agendado, confirmado, concluído, cancelado.
- **Relatórios (MVP)**:
  - KPIs (total, concluídos, cancelados, no-show, comparecimento %).
  - Tabela filtrável (período/profissional/status) + **Export CSV**.
- **Mobile (Flutter)** do paciente:
  - Login (CPF/senha de exemplo), **Home**, **Minha Agenda** (com seta para voltar).

---

## 🧰 Tecnologias

- **Backend**: Node.js 18+, Express, EJS, express-session, Helmet.
- **Web Admin**: EJS + assets estáticos.
- **Mobile**: Flutter 3.x+, Dart.
- **Banco**: ajustável (SQLite/Postgres/MySQL) conforme `.env`.

---

## ✅ Requisitos

- **Node.js** >= 18 e **npm** (ou yarn)
- **Flutter** >= 3.x (Android SDK/iOS configurados)
- Banco de dados local (SQLite) ou serviço (Postgres/MySQL)
- Portas livres (ex.: `3000`)

---

## 🚀 Como executar (TL;DR)

```bash
# 1) Backend (API + Web Admin)
cd backend
cp .env.example .env         # edite conforme sua máquina
npm install
npm run dev                  # ou: node src/server.js
# Abra: http://localhost:3000

# 2) Mobile (Flutter - app do paciente)
cd ../mobile/home_care_paciente
# Edite lib/core/constants.dart com a URL do backend (ver abaixo)
flutter pub get
flutter run                  # selecione emulador/dispositivo
🔐 Configuração do Backend
Criar o .env a partir de .env.example

Criar pastas obrigatórias se faltarem:

backend/public/

backend/uploads/

.env.example
Copie este conteúdo para backend/.env.example (e depois para backend/.env):

ini
Copiar código
# -------------------------------------------------
# App
# -------------------------------------------------
PORT=3000

# -------------------------------------------------
# Sessão (troque em produção)
# -------------------------------------------------
SESSION_SECRET=uma-chave-segura-em-dev

# -------------------------------------------------
# Banco de Dados (escolha um modo)
# -------------------------------------------------
# MODE 1: URL única (ex.: Postgres)
# DATABASE_URL=postgres://usuario:senha@localhost:5432/tcc

# MODE 2: Campos individuais
DB_CLIENT=sqlite           # sqlite | pg | mysql
DB_HOST=localhost
DB_PORT=5432
DB_USER=usuario
DB_PASSWORD=senha
DB_NAME=tcc

# -------------------------------------------------
# Arquivos
# -------------------------------------------------
UPLOADS_DIR=./uploads

# -------------------------------------------------
# CORS (se consumir API de outro domínio/porta)
# -------------------------------------------------
# CORS_ENABLED=false
# CORS_ORIGIN=http://localhost:5173
Observações

Em SQLite, normalmente você só precisa de DB_CLIENT=sqlite.

Em Postgres/MySQL, use DATABASE_URL ou os campos individuais (não ambos).

Em produção: SESSION_SECRET forte, CORS_ENABLED=true e CORS_ORIGIN configurado.

🔧 Scripts (package.json)
Exemplo de scripts no backend/package.json:

json
Copiar código
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "lint": "eslint .",
    "test": "jest"
  }
}
🖥️ Web Admin (EJS)
Acesse http://localhost:3000

Rotas comuns:

/auth/login — login do painel

/admin — dashboard/admin (rotas internas de agenda, pacientes, profissionais)

Permissões: ver src/config/permissions.js (ROLE_PERMISSIONS e roleHas()).

Estáticos: tudo em backend/public/ é servido em /public/....

Uploads: pasta backend/uploads/ (mantenha criada).

📱 App Mobile (Flutter)
Configurar API_BASE_URL (constants.dart)
Crie/edite mobile/home_care_paciente/lib/core/constants.dart:

dart
Copiar código
// lib/core/constants.dart
class AppConstants {
  // Emulador Android: 10.0.2.2 aponta para o host
  static const String apiBaseUrl = "http://10.0.2.2:3000";
  // iOS Simulator geralmente funciona com localhost
  // static const String apiBaseUrl = "http://localhost:3000";
  // Dispositivo físico: use o IP da sua máquina na mesma rede
  // static const String apiBaseUrl = "http://192.168.0.10:3000";
}
Garanta a permissão de Internet no Android:

xml
Copiar código
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
Comandos úteis Flutter
bash
Copiar código
flutter pub get
flutter devices
flutter emulators
flutter emulators --launch <id>
flutter run
flutter clean && flutter pub get   # se der cache estranho
🔌 API — Endpoints (guia)
A API real pode ter variações; abaixo um guia de referência para o que existe/está planejado.

Auth

POST /auth/login — cria sessão

POST /auth/logout — encerra sessão

Agenda/Atendimentos (ilustrativo)

GET /api/agendamentos?from=&to=&profissionalId=&status=

POST /api/agendamentos

PATCH /api/agendamentos/:id — atualizar status (agendado|confirmado|concluido|cancelado)

Relatórios (MVP)

GET /api/reports/agenda-resumo?from=YYYY-MM-DD&to=YYYY-MM-DD&profissionalId=&status=

GET /api/reports/atendimentos?from=&to=&profissionalId=&status=&page=&pageSize=

GET /api/reports/export/csv?type=atendimentos&from=&to=&...

Estáticos

GET /public/... — assets

Uploads acessíveis conforme mapeamento do servidor

Exemplos de curl:

bash
Copiar código
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"cpf":"83272912037","senha":"admin"}' -i

# Agendamentos (filtro por período)
curl "http://localhost:3000/api/agendamentos?from=2025-10-01&to=2025-10-31"

# Relatório resumo
curl "http://localhost:3000/api/reports/agenda-resumo?from=2025-10-01&to=2025-10-31"
📊 Relatórios (desenho atual)
KPIs: total de atendimentos, concluídos, cancelados, no-show, comparecimento (%), duração média.

Tabela detalhada: Data/Hora, Paciente, Profissional, Tipo, Status, Duração, Nota, Valor.

Export CSV respeitando filtros.

Filtros: período, profissional, status, tipo.

Próximos passos: produtividade por profissional, satisfação (NPS/nota), financeiro.

🔒 Segurança e Acesso
Cookies de sessão com httpOnly e express-session.

Helmet habilitado (ajuste CSP quando usar CDN/iframes).

RBAC via ROLE_PERMISSIONS (função roleHas no backend).

Auditoria recomendada: created_by, updated_by nos registros.

Em produção:

Use store de sessão persistente (ex.: Redis).

Desative mensagens de erro verbosas.

Force HTTPS atrás de proxy (set trust proxy).

⚙️ Boas práticas & Performance
Paginação server-side em listas e relatórios.

Índices em banco por data, profissional_id, status.

Cache leve (5–10 min) para KPIs agregadas.

(Opcional) Views materializadas para relatórios de período.

🐞 Troubleshooting (erros comuns)
Mobile não conecta no backend

Emulador Android usa http://10.0.2.2:3000 (não localhost).

Dispositivo físico: use o IP da máquina na mesma rede e libere firewall.

Erro 404 para imagens/arquivos

Verifique se os assets estão em backend/public/.

Confirme app.use('/public', express.static(...)) no server.js.

Uploads não aparecem

Crie backend/uploads/ e verifique permissões.

Sessão não persiste

Defina SESSION_SECRET no .env. Em produção, use store como Redis.

CORS bloqueando

Habilite e configure CORS_ENABLED=true e CORS_ORIGIN no .env se o front consumir de outra origem.

Flutter/Gradle cache estranho

flutter clean && flutter pub get.

🗺️ Roadmap curto
Consolidar Relatórios (KPIs + CSV).

Área do Profissional no mobile (meus atendimentos).

Migrar Web Admin para SPA (React/Vue) opcional.

Logística (rotas, ETA, “a caminho” em tempo real).

📄 Licença
Projeto acadêmico/experimental. Defina a licença conforme sua necessidade (ex.: MIT).

🙋 Suporte
Abra uma issue descrevendo:

Passos para reproduzir,

Logs/prints relevantes,

SO/versões (Node, Flutter, Android/iOS).