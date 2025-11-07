// src/controllers/paciente.controller.js
import { apiGet, apiPost } from '../services/api.service.js';

/** Extrai token (ajuste se seu ensureAuth usar outro local) */
function getToken(req) {
  if (req.user?.token) return req.user.token;
  if (req.session?.token) return req.session.token;
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function parseStatusFromError(err) {
  const m = /=>\s(\d+):\s/.exec(err?.message || '');
  return m ? Number(m[1]) : null;
}

/** Normaliza um paciente para a UI */
function normalizePatient(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const profile = raw.patientProfile || raw.profile || {};
  return {
    id: raw.id ?? raw.userId ?? raw.patientId ?? raw.uuid ?? String(raw.id || ''),
    name: raw.name ?? raw.fullName ?? raw.patient?.name ?? '',
    email: raw.email ?? raw.patient?.email ?? '',
    cpf: raw.cpf ?? raw.document ?? raw.patient?.cpf ?? '',
    patientProfile: {
      phone: profile.phone ?? raw.phone ?? '',
      address: profile.address ?? raw.address ?? '',
      birthDate: profile.birthDate ?? raw.birthDate ?? null,
    },
    _raw: raw,
  };
}

/** Tenta endpoints até achar um que exista (404 -> tenta próximo) */
async function getFirstAvailable(token, paths) {
  let lastErr = null;
  for (const path of paths) {
    try {
      const data = await apiGet(path, token);
      return { data, path };
    } catch (err) {
      lastErr = err;
      const status = parseStatusFromError(err);
      if (status && status !== 404) throw err; // 401/403/500: para por aqui
    }
  }
  throw lastErr;
}

/** Decide qual view de /pacientes renderizar conforme o papel */
function selectPacientesView(res) {
  const role = String(res?.locals?.auth?.role || '').toLowerCase();
  // você pediu: diferente para MÉDICO e PACIENTE
  if (role === 'medico' || role === 'médico' || role === 'doctor') {
    return 'pacientes/index.medico';   // novo arquivo
  }
  if (role === 'paciente' || role === 'patient') {
    return 'pacientes/index';          // seu arquivo atual
  }
  // Outros papéis (ex.: atendente/admin): escolha um padrão
  return 'pacientes/index';            // pode ter um index.atendente se quiser
}

/** GET /pacientes -> renderiza view conforme o papel */
export async function listarPacientes(req, res) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).send('Sem token.');

    const { data } = await getFirstAvailable(token, [
      '/patients',
      '/patient',
      '/users/patients',
      '/auth/patients',
    ]);

    const arr = Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
    const pacientes = (arr || []).map(normalizePatient).filter(Boolean);

    const viewName = selectPacientesView(res);
    return res.render(viewName, {
      titulo: 'Pacientes',
      pacientes,
    });
  } catch (err) {
    console.error('Erro listarPacientes:', err);
    return res.status(500).send('Erro ao carregar pacientes.');
  }
}

/** GET /pacientes/_list.json -> lista leve para auto-refresh */
export async function listarPacientesJson(req, res) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Sem token.' });

    const { data } = await getFirstAvailable(token, [
      '/patients',
      '/patient',
      '/users/patients',
      '/auth/patients',
    ]);

    const arr = Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
    const pacientes = (arr || []).map(normalizePatient).filter(Boolean);

    return res.json({ items: pacientes });
  } catch (err) {
    console.error('Erro listarPacientesJson:', err);
    const status = parseStatusFromError(err) ?? 500;
    return res.status(status).json({ error: 'Erro ao listar pacientes.' });
  }
}

/** GET /pacientes/:id -> detalhe JSON */
export async function pacienteDetalhe(req, res) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Sem token.' });

    const { id } = req.params;

    const { data } = await getFirstAvailable(token, [
      `/patients/${id}`,
      `/patient/${id}`,
      `/users/${id}`,
    ]);

    const norm = normalizePatient(data) || {};
    const exams =
      data?.patientExams ||
      data?.exams ||
      norm?._raw?.patientExams ||
      [];

    return res.json({ ...norm, patientExams: exams });
  } catch (err) {
    console.error('Erro pacienteDetalhe:', err);
    const status = parseStatusFromError(err) ?? 500;
    return res.status(status).json({ error: 'Erro ao buscar paciente.' });
  }
}

/** POST /pacientes -> proxy para /auth/register/patient */
export async function criarPaciente(req, res) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Sem token.' });

    const cpf = (req.body?.cpf || '').replace(/\D/g, '');
    const phone = (req.body?.phone || '').replace(/\D/g, '');
    const birthDate = req.body?.birthDate ? String(req.body.birthDate) : null;

    const payload = {
      name: String(req.body?.name || '').trim(),
      email: String(req.body?.email || '').trim(),
      cpf,
      password: String(req.body?.password || ''),
      phone: phone || null,
      address: req.body?.address || null,
      birthDate,
    };

    const created = await apiPost('/auth/register/patient', token, payload);
    const norm = normalizePatient(created) || normalizePatient(payload) || {
      id: created?.id ?? created?.userId ?? created?.patient?.id ?? '—',
      name: created?.name ?? created?.patient?.name ?? payload.name,
      patientProfile: { phone: created?.patientProfile?.phone ?? created?.phone ?? payload.phone ?? '' },
    };

    return res.status(201).json({
      id: norm.id,
      name: norm.name,
      patientProfile: { phone: norm.patientProfile?.phone ?? '' },
    });
  } catch (err) {
    console.error('Erro criarPaciente:', err);
    const status = parseStatusFromError(err) ?? 422;
    return res.status(status >= 500 ? 422 : status).json({ error: 'Erro ao criar paciente.' });
  }
}
