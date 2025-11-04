// src/controllers/home.controller.js
import { loginService } from '../services/auth.service.js';

export const home = (req, res) => {
  // área protegida (ensureAuth já garante), render normal com layout padrão
  res.render('home', { titulo: 'Dashboard' });
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
