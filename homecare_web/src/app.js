import express from 'express';
import session from 'express-session';
import path from 'path';
import dotenv from 'dotenv';
import expressLayouts from 'express-ejs-layouts';
import indexRoute from './routes/index.route.js';
import usuarioRoute from './routes/usuario.route.js';
import agendaRoute from './routes/agenda.route.js';
import relatorioRoute from './routes/relatorio.route.js';
import errorMiddleware from './middlewares/error.middleware.js';
import pacienteRoutes from './routes/paciente.route.js';

dotenv.config();
const app = express();

// sessão (antes das rotas)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8h
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.resolve('public')));


// EJS + layouts
app.set('view engine', 'ejs');
app.set('views', path.resolve('src/views'));
app.use(expressLayouts);
app.set('layout', 'layouts/layout');

// rotas
app.use('/', indexRoute);
app.use('/usuario', usuarioRoute);
app.use('/agenda', agendaRoute);
app.use('/pacientes', pacienteRoutes);
app.use('/relatorio', relatorioRoute);


// 404 + erro
app.use((req, res) => res.status(404).render('home', { titulo: 'Não encontrado' }));
app.use(errorMiddleware);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Admin on http://localhost:${PORT}`));
