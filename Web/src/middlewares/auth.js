exports.ensureAuth = (req, res, next) => {
  if (req.session?.user) return next();
  return res.redirect('/login');
};

exports.ensureRole = (...roles) => {
  return (req, res, next) => {
    const u = req.session?.user;
    if (!u) return res.redirect('/login');
    if (roles.includes(u.role)) return next();
    return res.status(403).render('auth/forbidden', { title: 'Acesso negado' });
  };
};
