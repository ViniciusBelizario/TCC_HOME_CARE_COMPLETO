require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// segurança e estáticos
app.use(helmet({ contentSecurityPolicy: false }));
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsers + sessão
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 4 }
}));

// uploads estáticos
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// user global em views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = !!req.session.user && req.session.user.role === 'ADMIN';
  res.locals.isMedico = !!req.session.user && req.session.user.role === 'MEDICO';
  res.locals.isAtendente = !!req.session.user && req.session.user.role === 'ATENDENTE';
  next();
});

// rotas
app.use('/', authRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => res.status(404).send('404'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
