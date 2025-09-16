function unique(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function cleanJoin(...parts) {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '');
}

function computeLoginCandidates() {
  const prefix = (process.env.API_PREFIX || '').trim();
  const fromEnv = (process.env.API_LOGIN_PATHS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const defaults = ['/auth/login', '/sessions', '/login', '/api/auth/login', '/api/login'];

  const expand = (p) => {
    if (!p.startsWith('/')) p = '/' + p;
    const withPrefix = prefix ? cleanJoin(prefix, p) : p;
    return unique([p, withPrefix]);
  };

  let candidates = [];
  for (const p of [...fromEnv, ...defaults]) {
    candidates = candidates.concat(expand(p));
  }
  candidates = unique(candidates.map(p => (p.startsWith('/') ? p : `/${p}`)));
  return candidates;
}

module.exports = {
  computeLoginCandidates,
};
