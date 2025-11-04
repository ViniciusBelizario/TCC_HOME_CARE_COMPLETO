// src/controllers/paciente.controller.js
import { apiGet, apiPost } from '../services/api.service.js';

/** Extrai token do request (ajuste aqui se o seu ensureAuth coloca em outro lugar) */
function getToken(req) {
  if (req.user?.token) return req.user.token;
  if (req.session?.token) return req.session.token;

  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (auth?.startsWith('Bearer ')) return auth.slice(7);

  return null;
}

/** Lê status do erro lançado pelo apiGet/apiPost para decidir fallback */
function parseStatusFromError(err) {
  const m = /=>\s(\d+):\s/.exec(err?.message || '');
  return m ? Number(m[1]) : null;
}

/** Normaliza um item de paciente para o formato esperado na tela */
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
    // Passa campos “originais” para detalhe, caso a tela precise
    _raw: raw,
  };
}

/** Tenta endpoints em ordem até achar um que exista (status !== 404) */
async function getFirstAvailable(token, paths) {
  let lastErr = null;
  for (const path of paths) {
    try {
      const data = await apiGet(path, token);
      return { data, path };
    } catch (err) {
      lastErr = err;
      const status = parseStatusFromError(err);
      if (status && status !== 404) {
        // Erro “real” (401/403/500 etc.) — não adianta tentar outros
        throw err;
      }
      // 404: tenta próximo
    }
  }
  // Se terminou o loop só com 404, relança o último para mensagem coerente
  throw lastErr;
}

/**
 * GET /pacientes
 * Renderiza a lista de pacientes.
 * Endpoints tentados (na sua API: BASE_URL + path):
 *   1) /patients
 *   2) /patient
 *   3) /users/patients
 *   4) /auth/patients
 */
export async function listarPacientes(req, res) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).send('Sem token.');

    const { data, path } = await getFirstAvailable(token, [
      '/patients',
      '/patient',
      '/users/patients',
      '/auth/patients',
    ]);

    const arr = Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
    const pacientes = (arr || []).map(normalizePatient).filter(Boolean);

    return res.render('pacientes/index', {
      titulo: `Pacientes`, // você pode incluir o path resolvido se quiser: `Pacientes (${path})`
      pacientes,
    });
  } catch (err) {
    console.error('Erro listarPacientes:', err);
    return res.status(500).send('Erro ao carregar pacientes.');
  }
}

/**
 * GET /pacientes/:id
 * Retorna JSON com detalhe (usado pelo fetch no front).
 * Endpoints tentados:
 *   1) /patients/:id
 *   2) /patient/:id
 *   3) /users/:id
 */
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

    // Normaliza mas também devolve o _raw para você exibir anexos/exames etc.
    const norm = normalizePatient(data) || {};
    // Se sua API devolve exames em arrays específicos, tente mapeá-los:
    const exams =
      data?.patientExams ||
      data?.exams ||
      data?._raw?.patientExams ||
      [];

    return res.json({
      ...norm,
      patientExams: exams,
    });
  } catch (err) {
    console.error('Erro pacienteDetalhe:', err);
    const status = parseStatusFromError(err) ?? 500;
    return res.status(status).json({ error: 'Erro ao buscar paciente.' });
  }
}

/**
 * POST /pacientes
 * Proxy para POST /auth/register/patient
 */
export async function criarPaciente(req, res) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Sem token.' });

    const payload = {
      name: req.body?.name,
      email: req.body?.email,
      cpf: (req.body?.cpf || '').replace(/\D/g, ''),
      password: req.body?.password,
      phone: req.body?.phone,
      address: req.body?.address,
      birthDate: req.body?.birthDate,
    };

    const created = await apiPost('/auth/register/patient', token, payload);

    // Normaliza o retorno para a tabela do front já exibir “na hora”
    const norm = normalizePatient(created) || {
      id: created?.id ?? created?.userId ?? created?.patient?.id ?? '—',
      name: created?.name ?? created?.patient?.name ?? payload.name,
      patientProfile: {
        phone: created?.patientProfile?.phone ?? created?.phone ?? payload.phone ?? '-',
      },
    };

    return res.status(201).json({
      id: norm.id,
      name: norm.name,
      patientProfile: { phone: norm.patientProfile?.phone ?? '-' },
      // Se quiser devolver tudo:
      // ...created
    });
  } catch (err) {
    console.error('Erro criarPaciente:', err);
    const status = parseStatusFromError(err) ?? 500;
    return res.status(status).json({ error: 'Erro ao criar paciente.' });
  }
}
