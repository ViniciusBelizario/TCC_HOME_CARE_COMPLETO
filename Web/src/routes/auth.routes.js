const express = require('express');
const router = express.Router();
const { login } = require('../services/api');

router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/admin/dashboard');
  return res.redirect('/login');
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/admin/dashboard');
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, used } = await login(email, password);
    const user = data.user || {};
    const role = String(user.role || '').toUpperCase();

    if (!data.token || !user.email || !role) {
      return res.status(401).render('auth/login', {
        error: 'Resposta de autenticação incompleta. Verifique o backend.'
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name || 'Usuário',
      email: user.email,
      role,
      token: data.token,
      _loginPath: used, // útil p/ verificar qual caminho foi usado
    };

    return res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]', err.message, err.details || '');
    let hint = '';
    if (process.env.NODE_ENV !== 'production') {
      hint = '<br/><small style="opacity:.8">Dica: confira API_BASE_URL, API_PREFIX e API_LOGIN_PATHS no .env</small>';
    }
    return res.status(401).render('auth/login', { error: (err?.message || 'Falha ao autenticar.') + hint });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => { res.clearCookie('connect.sid'); res.redirect('/login'); });
});

// debug opcional
router.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'sem sessão' });
  res.json(req.session.user);
});

module.exports = router;
