// src/server.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');

const availabilityRoutes = require('./routes/availability');
const reportRoutes = require('./routes/reports');
const appointmentsAdminRoutes = require('./routes/appointments_admin');

const app = express();

// Logs de boot
console.log('[BOOT] NODE_ENV =', process.env.NODE_ENV || 'development');
console.log('[BOOT] API_BASE_URL =', process.env.API_BASE_URL || '(not set)');

// Segurança e parsers
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessão
app.set('trust proxy', 1);
app.use(session({
  name: 'hc.sid',
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 2, // 2h
  },
}));

// Locals globais para as views (user e flags de papel)
app.use((req, res, next) => {
  const user = req.session?.user || null;
  const role = user?.role ? String(user.role).toUpperCase() : null;

  res.locals.user = user;
  res.locals.isAdmin = role === 'ADMIN';
  res.locals.isAtendente = role === 'ATENDENTE';
  res.locals.isMedico = role === 'MEDICO';
  res.locals.isEnfermeiro = role === 'ENFERMEIRO';
  next();
});

// View engine + estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

// Raiz: se logado vai ao dashboard; senão, login
app.get('/', (req, res) => {
  if (req.session?.user?.token) return res.redirect('/admin/dashboard');
  return res.redirect('/auth/login');
});

// ===== Rotas da aplicação (AGORA após session/locals) =====
try {
  const authRoutes = require('./routes/auth');
  app.use(authRoutes);
  console.log('[ROUTES] /auth/* carregadas');
} catch (e) {
  console.warn('[WARN] Rotas de auth não carregadas:', e.message);
}

try {
  const dashboardRoutes = require('./routes/dashboard');
  app.use(dashboardRoutes);
  console.log('[ROUTES] /admin/dashboard carregada');
} catch (e) {
  console.warn('[WARN] Rota de dashboard não carregada:', e.message);
}

try {
  const userRoutes = require('./routes/users');
  app.use(userRoutes);
  console.log('[ROUTES] /admin/usuarios carregadas');
} catch (e) {
  console.warn('[WARN] Rotas de usuários não carregadas:', e.message);
}

// Outras rotas (se usarem requireAuth, também já estão após a session)
app.use(availabilityRoutes);
app.use(reportRoutes);
app.use(appointmentsAdminRoutes);

// 404
app.use((req, res) => {
  res.status(404);
  try { return res.render('errors/404'); }
  catch { return res.send('404 - Not Found'); }
});

// Handler de erro
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500);
  try { return res.render('errors/500', { error: err }); }
  catch { return res.send(err.message || 'Erro interno'); }
});

// Handlers globais
process.on('unhandledRejection', (err) => console.error('[UNHANDLED REJECTION]', err));
process.on('uncaughtException', (err) => console.error('[UNCAUGHT EXCEPTION]', err));

// Start
const PORT = Number(process.env.PORT) || 3003;
app.listen(PORT, () => {
  console.log(`[OK] Front rodando em http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('[LISTEN ERROR]', err);
});
