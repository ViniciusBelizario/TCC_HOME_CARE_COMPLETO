// src/services/api.js
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

      if (req && (res.status === 401 || res.status === 403)) {
        try { req.session.destroy(() => {}); } catch {}
      }
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

// Login resiliente em múltiplos caminhos/formats
async function login(email, password) {
  const payloads = [(e,p)=>({email:e,password:p}), (e,p)=>({email:e,senha:p})];
  const candidates = computeLoginCandidates();

  const errors = [];
  for (const path of candidates) {
    for (const makeBody of payloads) {
      try {
        const body = makeBody(email, password);
        const data = await request(path, { method:'POST', headers:{'Content-Type':'application/json'}, body });

        if (data && data.token && data.user && data.user.email) {
          console.log(`[API] Login ok em ${path}`);
          return { data, used: path };
        }
        if (data && data.token && (data.id || data.userId) && (data.role || data.perfil)) {
          const user = {
            id: data.id || data.userId,
            name: data.name || data.nome || 'Usuário',
            email: data.email || email,
            role: (data.role || data.perfil || 'USUARIO').toUpperCase(),
          };
          console.log(`[API] Login normalizado em ${path}`);
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

// Admin users (exemplo legado)
async function listUsers(req, q) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return request(`/users${qs}`, { method: 'GET', req });
}
async function createUser(req, payload) {
  return request('/users', { method:'POST', headers:{'Content-Type':'application/json'}, body: payload, req });
}

// Pacientes (Home Care)
async function listPatients(req, search) {
  const endpoint = search ? `/api/patients?search=${encodeURIComponent(search)}` : '/api/patients';
  return request(endpoint, { method: 'GET', req });
}

// ✅ Novo: cadastro de paciente
async function registerPatient(req, payload) {
  // Espera: { name, email, cpf, password, phone, address, birthDate(YYYY-MM-DD) }
  return request('/api/auth/register/patient', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    req,
  });
}

// Agendamentos
async function listAppointments(req) { return request('/appointments', { method: 'GET', req }); }

// --- DOCTORS ---
async function listDoctors(req, q) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return request(`/api/doctors${qs}`, { method: 'GET', req });
}

// --- AVAILABILITY (AGENDA) ---
async function createAvailability(req, { doctorId, startsAt, endsAt }) {
  return request('/api/availability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { doctorId, startsAt, endsAt },
    req,
  });
}

async function getDoctorAppointments(req, { doctorId }) {
  if (!doctorId) throw new Error('doctorId é obrigatório');
  const candidates = [
    `/appointments/doctor/${doctorId}`,
    `/api/appointments/doctor/${doctorId}`,
  ];
  const { data } = await requestFirstOk(candidates, { method: 'GET', req });
  return data; // array
}

async function createDayOpenings(req, { doctorId, date, startTime, endTime, durationMin }) {
  return request('/api/availability/day-openings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { doctorId, date, startTime, endTime, durationMin },
    req,
  });
}

async function deleteAvailability(req, id) {
  return request(`/api/availability/${id}`, { method: 'DELETE', req });
}

async function deleteUnusedRange(req, { from, to, doctorId }) {
  return request('/api/availability/unused', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: { from, to, doctorId },
    req,
  });
}

async function listAvailability(req, { doctorId, from, to }) {
  const qs = new URLSearchParams({ doctorId, from, to }).toString();
  return request(`/api/availability?${qs}`, { method: 'GET', req });
}

// --- APPOINTMENTS ---
async function updateAppointmentStatus(req, { appointmentId, status }) {
  if (!appointmentId) throw new Error('appointmentId é obrigatório');
  if (!status) throw new Error('status é obrigatório');

  const body = { status };
  const candidates = [
    `/appointments/${appointmentId}/status`,
    `/api/appointments/${appointmentId}/status`,
  ];
  const { data } = await requestFirstOk(candidates, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
    req,
  });
  return data;
}

// ==== REPORTS ====

function buildQS(obj) {
  const params = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') params.append(k, v);
  });
  return params.toString();
}

/* =========================
 *      REPORTS (robusto)
 * ========================= */


async function requestFirstOk(candidates, options = {}) {
  const errors = [];
  for (const path of candidates) {
    try {
      const data = await request(path, options);
      return { data, used: path };
    } catch (e) {
      errors.push(`${path}: ${e.status || ''} ${e.message}`);
    }
  }
  const err = new Error('Falha em todos os caminhos. ' + errors.join(' | '));
  err.details = errors;
  throw err;
}

// KPIs gerais
async function getReportKpis(req, { from, to }) {
  const qs = buildQS({ from, to });
  const candidates = [
    `/reports/kpis?${qs}`,
    `/api/reports/kpis?${qs}`,
  ];
  const { data } = await requestFirstOk(candidates, { method: 'GET', req });
  return data;
}

// Consultas por DIA (agregado simples)
async function getAppointmentsAggregate(req, { from, to, doctorId, format = 'json' }) {
  const qs = buildQS({ from, to, doctorId, format });
  const candidates = [
    `/reports/appointments/aggregate?${qs}`,
    `/api/reports/appointments/aggregate?${qs}`,
  ];
  const { data } = await requestFirstOk(candidates, { method: 'GET', req });
  return data;
}

// Utilização por médico
async function getDoctorsUtilization(req, { from, to, format = 'json' }) {
  const qs = buildQS({ from, to, format });
  const candidates = [
    `/reports/doctors/utilization?${qs}`,
    `/api/reports/doctors/utilization?${qs}`,
  ];
  const { data } = await requestFirstOk(candidates, { method: 'GET', req });
  return data;
}

// Retenção de pacientes
async function getPatientsRetention(req, { from, to, baselineFrom, baselineTo }) {
  const qs = buildQS({ from, to, baselineFrom, baselineTo });
  const candidates = [
    `/reports/patients/retention?${qs}`,
    `/api/reports/patients/retention?${qs}`,
  ];
  const { data } = await requestFirstOk(candidates, { method: 'GET', req });
  return data;
}

// Consultas — detalhado/aggregado
async function getAppointmentsDetailed(req, { from, to, doctorId, format = 'json' }) {
  const qs = buildQS({ from, to, doctorId, format });
  const candidates = [
    `/reports/appointments/detailed?${qs}`,
    `/api/reports/appointments/detailed?${qs}`,
  ];
  const { data } = await requestFirstOk(candidates, { method: 'GET', req });
  return data;
}
module.exports = {
  request,
  login,
  listUsers,
  createUser,
  listPatients,
  registerPatient, // ✅ exportado
  listAppointments,
   listDoctors,
  createAvailability,
  createDayOpenings,
  deleteAvailability,
  deleteUnusedRange,
  listAvailability,
  updateAppointmentStatus,
  getReportKpis,
  getAppointmentsAggregate,
  getDoctorsUtilization,
  getPatientsRetention,
  getAppointmentsDetailed,
  getDoctorAppointments
};
