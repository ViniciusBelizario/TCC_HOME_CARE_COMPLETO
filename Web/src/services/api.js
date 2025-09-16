// fetch nativo do Node >=18
const { computeLoginCandidates } = require('../config/apiPaths');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3333';
const DEFAULT_TIMEOUT = 10000; // ms

function withAuthHeaders(req, extra = {}) {
  const headers = { ...(extra || {}) };
  const token = req?.session?.user?.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(path, { method = 'GET', headers = {}, body, timeout = DEFAULT_TIMEOUT, req } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const opts = {
    method,
    headers: withAuthHeaders(req, headers),
    signal: controller.signal,
  };

  if (body !== undefined) {
    const isStringBody = (typeof body === 'string');
    if (!isStringBody && !opts.headers['Content-Type']) {
      opts.headers['Content-Type'] = 'application/json';
    }
    opts.body = isStringBody ? body : JSON.stringify(body);
  }

  try {
    const res = await fetch(url, opts);
    clearTimeout(id);

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
      const error = (data && (data.error || data.message)) || `HTTP ${res.status}`;
      const err = new Error(error);
      err.status = res.status;
      err.data = data;
      err.url = url;
      throw err;
    }
    return data;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      const e = new Error('Tempo de requisição excedido.');
      e.status = 408;
      e.url = path;
      throw e;
    }
    throw err;
  }
}

/* =========================
 *     ENDPOINTS DA API
 * ========================= */

// Auth — tenta candidatos do .env (com prefixo), priorizando o primeiro válido
async function login(email, password) {
  const payloads = [
    (e, p) => ({ email: e, password: p }),
    (e, p) => ({ email: e, senha: p }),
  ];
  const candidates = computeLoginCandidates(); // ex.: ['/api/auth/login', '/auth/login', ...]

  const errors = [];
  for (const path of candidates) {
    for (const makeBody of payloads) {
      try {
        const body = makeBody(email, password);
        const data = await request(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        // esperado: { token, user:{ id, name, email, role } }
        if (data && data.token && data.user && data.user.email) {
          return { data, used: path };
        }

        // fallback: normalização (se a API tiver outro formato)
        if (data && data.token && (data.id || data.userId) && (data.role || data.perfil)) {
          const user = {
            id: data.id || data.userId,
            name: data.name || data.nome || 'Usuário',
            email: data.email || email,
            role: (data.role || data.perfil || 'USUARIO').toUpperCase(),
          };
          return { data: { token: data.token, user }, used: path };
        }

        errors.push(`Formato inesperado em ${path}`);
      } catch (e) {
        errors.push(`${path}: ${e.status || ''} ${e.message}`);
      }
    }
  }

  const err = new Error('Falha ao autenticar em todos os caminhos possíveis. ' + errors.join(' | '));
  err.details = errors;
  throw err;
}

// Usuários
async function listUsers(req, q) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return request(`/users${qs}`, { method: 'GET', req });
}

async function createUser(req, payload) {
  return request('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    req,
  });
}

// Agendamentos
async function listAppointments(req) {
  return request('/appointments', { method: 'GET', req });
}

module.exports = {
  login,
  listUsers,
  createUser,
  listAppointments,
};
