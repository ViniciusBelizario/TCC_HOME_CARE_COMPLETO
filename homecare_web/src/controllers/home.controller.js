// src/controllers/home.controller.js
import { loginService } from '../services/auth.service.js';

export const home = (req, res) => {
  // Área protegida (ensureAuth já garante). Renderiza a nova Home.
  // res.locals.auth/user já vêm do seu setViewLocals (seu layout usa isso).
  res.render('home/index', { titulo: 'Home' });
};

export const login = (req, res) => {
  // se já estiver logado, manda para a home
  if (req.session?.user) return res.redirect('/');
  // usa layout específico de autenticação (sem sidebar/header)
  res.render('login', { titulo: 'Login', layout: 'layouts/auth' });
};

export const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await loginService({ email, password });

    const allowed = ['ADMIN', 'ATENDENTE', 'MEDICO'];
    if (!allowed.includes(user.role)) {
      return res.status(403).render('login', {
        titulo: 'Login',
        layout: 'layouts/auth',
        erro: 'Perfil sem acesso.'
      });
    }

    req.session.token = token;
    req.session.user = user;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(401).render('login', {
      titulo: 'Login',
      layout: 'layouts/auth',
      erro: 'Credenciais inválidas.'
    });
  }
};

export const logout = (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
};
