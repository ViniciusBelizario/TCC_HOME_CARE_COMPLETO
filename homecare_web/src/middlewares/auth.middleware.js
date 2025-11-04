// src/middlewares/auth.middleware.js
export function ensureAuth(req, res, next) {
  if (req.session?.user && req.session?.token) return next();
  return res.redirect('/login');
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    const role = req.session?.user?.role;
    if (role && roles.includes(role)) return next();
    return res.status(403).render('home', { titulo: 'Acesso negado' });
  };
}
