const api = require('../services/api');

exports.viewLogin = (req, res) => {
  if (req.session?.user) return res.redirect('/admin/dashboard');
  res.render('auth/login', { error: null });
};

exports.doLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data } = await api.login(email, password);
    req.session.user = { ...data.user, token: data.token };
    res.redirect('/admin/dashboard');
  } catch (err) {
    res.status(401).render('auth/login', { error: err.message || 'Falha ao autenticar' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
};
