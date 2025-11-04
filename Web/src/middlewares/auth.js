function requireAuth(req, res, next) {
  if (!req.session?.user?.token) return res.redirect('/auth/login');
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.session?.user?.role?.toUpperCase();
    if (!role) return res.redirect('/auth/login');
    if (!roles.map(r => r.toUpperCase()).includes(role)) {
      return res.status(403).render('auth/forbidden');
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
