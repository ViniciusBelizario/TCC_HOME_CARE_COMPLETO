# TCC — Plataforma de Home Care (Web Admin, Backend e Mobile)

Sistema para **agendamento e acompanhamento de atendimentos domiciliares** em saúde, com:
- **Backend (Node.js + Express + EJS)**: API REST, autenticação por sessão, painel administrativo web (EJS).
- **Web Admin (EJS)**: gestão de pacientes, profissionais, agenda e relatórios (MVP).
- **App Mobile (Flutter)**: acesso do paciente (login, agenda, histórico) e, futuramente, área do profissional.

> Observação: logística (rotas/tempo de deslocamento) está fora do escopo atual — o foco deste README é a **execução do projeto como está hoje** (login, agendamentos, perfis e base de relatórios).

---

## Sumário
- [Estrutura do repositório](#-estrutura-do-repositório)
- [Funcionalidades (MVP)](#-funcionalidades-mvp-atual)
- [Tecnologias](#-tecnologias)
- [Requisitos](#-requisitos)
- [Execução Rápida (TL;DR)](#-execução-rápida-tldr)
- [Configuração do Backend](#-configuração-do-backend)
- [Web Admin (EJS)](#️-web-admin-ejs)
- [App Mobile (Flutter)](#-app-mobile-flutter)
- [Endpoints (exemplos)](#-endpoints-exemplos)
- [Relatórios (desenho atual)](#-relatórios-o-que-já-foi-desenhado)
- [Segurança](#-segurança)
- [Scripts úteis](#-scripts-úteis-sugestão)
- [Troubleshooting](#-troubleshooting)
- [Roadmap curto](#-roadmap-curto)
- [Licença](#-licença)
- [Suporte](#-suporte)

---

## 🧱 Estrutura do repositório
├── backend/ # API + Web Admin (EJS)
│ ├── src/
│ │ ├── server.js # App Express (Helmet, sessão, estáticos, EJS)
│ │ ├── routes/
│ │ │ ├── auth.routes.js
│ │ │ └── admin.routes.js
│ │ ├── views/ # Páginas EJS (Admin/Web)
│ │ ├── config/
│ │ │ └── permissions.js # Permissões e papéis (ROLE_PERMISSIONS)
│ │ └── ...
│ ├── public/ # Assets estáticos (CSS/JS/Imagens)
│ ├── uploads/ # Uploads (criar pasta)
│ ├── package.json
│ └── .env.example
└── mobile/
└── home_care_paciente/
├── lib/
│ ├── screens/
│ │ ├── login_screen.dart
│ │ ├── home_screen.dart
│ │ └── minha_agenda_screen.dart
│ ├── core/
│ │ ├── colors.dart
│ │ └── constants.dart # API_BASE_URL (definir aqui)
│ └── widgets/
├── pubspec.yaml
└── android/ ios/

---

## ✨ Funcionalidades (MVP atual)

- Autenticação (sessão) e controle de acesso por **papéis/permissões**.
- Gestão básica: **pacientes, profissionais e agendamentos**.
- **Agenda** (criação, listagem, status: agendado/confirmado/concluído/cancelado).
- **Relatórios (MVP)**:
  - Cards de resumo: total de atendimentos, concluídos, cancelados, no-show, taxa de comparecimento.
  - Listagem filtrável por período/profissional/status (exportável CSV).
- App **mobile (Flutter)** para paciente:
  - Login (CPF/senha — placeholder), **Home**, **Minha Agenda** (com seta para voltar).

---

## 🧰 Tecnologias

- **Backend**: Node.js 18+, Express, EJS, express-session, Helmet.
- **Web Admin**: EJS + assets estáticos.
- **Mobile**: Flutter (3.x+), Dart.
- **Banco**: configurável (Postgres/MySQL/SQLite) — conforme seu `.env`.

---

## ✅ Requisitos

- Node.js **>= 18**
- npm ou yarn
- Flutter **>= 3.x** (Android SDK/iOS configurados)
- Banco de dados (opcional/ajustável ao seu ambiente)

---

## 🚀 Execução Rápida (TL;DR)

```bash
# 1) Backend (API + Web Admin)
cd backend
cp .env.example .env        # edite as variáveis (veja abaixo)
npm install
npm run dev                 # se tiver nodemon; senão: node src/server.js
# Acesse: http://localhost:3000

# 2) Mobile (Flutter - app do paciente)
cd ../mobile/home_care_paciente
# Ajuste lib/core/constants.dart com a URL do backend (API_BASE_URL)
flutter pub get
flutter run                 # escolha Android/iOS

# Porta do servidor
PORT=3000

# Sessão
SESSION_SECRET=uma-chave-segura-em-dev

# Banco de dados (ajuste conforme o seu ambiente)
# Use uma das opções abaixo:

# Exemplo Postgres (via URL):
# DATABASE_URL=postgres://usuario:senha@localhost:5432/tcc

# Exemplo individual:
DB_CLIENT=sqlite             # sqlite | pg | mysql
DB_HOST=localhost
DB_PORT=5432
DB_USER=usuario
DB_PASSWORD=senha
DB_NAME=tcc

# Uploads
UPLOADS_DIR=./uploads

Pastas obrigatórias

backend/public/ (já existe)

backend/uploads/ (crie caso não exista)

Executando o Backend

cd backend
npm install
npm run dev        # recomendado (nodemon)
# ou
node src/server.js
Servidor inicia em http://localhost:${PORT} (padrão 3000).

Web Admin (EJS) é servido pelo mesmo servidor (ex.: /admin, /auth/login).

Assets: /public/...

Uploads: pasta uploads (mapeada pelo app).

🖥️ Web Admin (EJS)

Acesse http://localhost:3000

Rotas comuns:

/auth/login — login do painel

/admin — dashboard/admin (rotas internas de agenda, pacientes, profissionais)

Permissões: ver src/config/permissions.js (ROLE_PERMISSIONS e roleHas()).

📱 App Mobile (Flutter)

Configure a URL da API em mobile/home_care_paciente/lib/core/constants.dart:

// constants.dart
class AppConstants {
  // Se estiver no emulador Android, use 10.0.2.2 no lugar de localhost
  static const String apiBaseUrl = "http://10.0.2.2:3000";
  // No dispositivo físico, use o IP da sua máquina na mesma rede (ex.: http://192.168.0.10:3000)
}


Instale dependências e rode:

cd mobile/home_care_paciente
flutter pub get
flutter run

⚠️ Dicas importantes (Android/iOS)

Android emulador não enxerga localhost do host. Use http://10.0.2.2:3000.

iOS Simulator pode usar http://localhost:3000.

Se for dispositivo físico, use o IP da máquina (ex.: http://192.168.0.10:3000) e garanta que ambos estão na mesma rede.

Em Android, confirme a permissão de Internet no AndroidManifest.xml:

<uses-permission android:name="android.permission.INTERNET" />

🧪 Endpoints (exemplos)

A API real pode ter variações; abaixo um guia de referência para o que já existe/está planejado.

Auth

POST /auth/login — cria sessão

POST /auth/logout — encerra sessão

Agenda/Atendimentos (ilustrativo)

GET /api/agendamentos?from=&to=&profissionalId=&status=

POST /api/agendamentos

PATCH /api/agendamentos/:id (status: agendado/confirmado/concluído/cancelado)

Relatórios (MVP)

GET /api/reports/agenda-resumo?from=YYYY-MM-DD&to=YYYY-MM-DD&profissionalId=&status=

GET /api/reports/atendimentos?from=&to=&profissionalId=&status=&page=&pageSize=

GET /api/reports/export/csv?type=atendimentos&from=&to=&...

Para performance, use paginação e filtros. Crie índices por data, profissional_id, status.

📊 Relatórios (o que já foi desenhado)

KPIs: total de atendimentos, concluídos, cancelados, no-show, comparecimento (%), duração média.

Tabela detalhada: Data/Hora, Paciente, Profissional, Tipo, Status, Duração, Nota, Valor.

Export CSV respeitando os filtros.

Filtros padrão: período, profissional, status, tipo.

Próximos passos: produtividade por profissional, satisfação (NPS/nota), financeiro.

🔒 Segurança

Sessions com express-session + cookie httpOnly.

Helmet habilitado (CSP customizável se usar CDN/iframes).

RBAC (Role-Based Access Control) via ROLE_PERMISSIONS.

Auditoria: recomenda-se registrar created_by/updated_by.

🧰 Scripts úteis (sugestão)

No backend/package.json:

{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "lint": "eslint .",
    "test": "jest"
  }
}


Se algum script não existir no seu projeto, basta usar o comando equivalente (ex.: node src/server.js).

🐞 Troubleshooting

Mobile não conecta no backend: verifique a URL (emulador Android = 10.0.2.2), firewall e porta 3000.

Erro 404 para imagens/arquivos: confirme que os assets estão em backend/public/ e que app.use('/public', express.static(...)) está ativo.

Uploads não aparecem: crie a pasta backend/uploads/ e verifique permissões.

Sessão não persiste: defina SESSION_SECRET no .env. Em produção, use store persistente (ex.: Redis).

CORS: caso consuma a API de um domínio diferente (frontend separado), habilite cors() no backend.

Emulador Android (Flutter): sempre use 10.0.2.2 para acessar o host.

🗺️ Roadmap curto

Consolidar Relatórios (KPIs + CSV)

Área do Profissional no mobile (meus atendimentos)

Migração opcional do Web Admin para SPA (React/Vue)

Logística (rotas, ETA, “a caminho” em tempo real)

📄 Licença

Projeto acadêmico/experimental. Defina a licença conforme sua necessidade (ex.: MIT).

🙋 Suporte

Abra uma issue descrevendo:

Passos para reproduzir,

Logs/prints relevantes,

SO/versões (Node, Flutter, Android/iOS).


Se quiser, também te gero um **`.env.example`** separado e um **modelo de `constants.dart`** com `API_BASE_URL` comentado para cada cenário (emulador, device físico, iOS). Quer que eu inclua?
