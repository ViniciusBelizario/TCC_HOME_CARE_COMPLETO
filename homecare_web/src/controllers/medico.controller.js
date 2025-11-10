// src/controllers/medico.controller.js
import { apiGet, apiPost, apiPatch } from '../services/api.service.js';

/* ============= Utils ============= */
function getToken(req, res) {
  if (req.session?.token) return req.session.token;
  const auth = req.headers?.authorization || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return res.locals?.auth?.token || null;
}

function startEndOfTodayLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  return {
    start: new Date(y, m, d, 0, 0, 0, 0),
    end:   new Date(y, m, d, 23, 59, 59, 999),
  };
}

function parseStatusFromError(err) {
  const m = /=>\s*(\d{3}):/.exec(err?.message || '');
  return m ? Number(m[1]) : 500;
}

function normalizeAppointment(raw) {
  const patient = raw.patient || {};
  const start = new Date(raw.startsAt);
  const phone = patient?.patientProfile?.phone || patient?.phone || '-';

  // Novo: normaliza a observação do médico (quando vier)
  const po = raw.patientObservation || null;
  const patientObservation = po ? {
    note: po.note || '',
    createdAt: po.createdAt || null,
    doctorId: po.doctor?.id ?? null,
    doctorName: po.doctor?.name ?? '',
  } : null;

  return {
    appointmentId: raw.id,
    status: String(raw.status || '').toUpperCase(),
    startsAt: raw.startsAt,
    endsAt: raw.endsAt || raw.endsAt,
    timeDisplay: start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    patientId: patient.id,
    patientName: patient.name,
    patientPhone: phone,
    patientAddressFull: raw.patientAddressFull || raw.patientAddress || '-',
    notes: raw.notes || '',
    patientObservation, // <- incluído
    _raw: raw,
  };
}

/* ============= Controllers ============= */

// Página
export async function getPacientesHojePage(req, res) {
  try {
    return res.render('medico/pacientes-hoje', {
      titulo: 'Pacientes de Hoje',
      auth: res.locals?.auth || null,
    });
  } catch (err) {
    console.error('Erro getPacientesHojePage:', err);
    return res.status(500).render('errors/500', { titulo: 'Erro interno' });
  }
}

// JSON do dia: retorna "open" (CONFIRMED) e "completed" (COMPLETED)
export async function getPacientesHojeJson(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).json({ error: 'Sem token.' });

    const data = await apiGet('/appointments/my', token);
    const arr = Array.isArray(data) ? data : (data?.items || []);

    const { start, end } = startEndOfTodayLocal();
    const today = arr.filter(a => {
      const dt = new Date(a.startsAt);
      return dt >= start && dt <= end;
    });

    const confirmed = today.filter(a => String(a.status).toUpperCase() === 'CONFIRMED');
    const completed = today.filter(a => String(a.status).toUpperCase() === 'COMPLETED');

    return res.json({
      open: confirmed.map(normalizeAppointment),
      completed: completed.map(normalizeAppointment),
    });
  } catch (err) {
    console.error('Erro getPacientesHojeJson:', err);
    const status = parseStatusFromError(err);
    return res.status(status).json({ error: 'Erro ao buscar pacientes do dia.' });
  }
}

// Exames
export async function getExamesPaciente(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).json({ error: 'Sem token.' });

    const { patientId } = req.params;
    const list = await apiGet(`/exams/patient/${patientId}`, token);
    const items = Array.isArray(list) ? list : (list?.items || list?.data || []);
    return res.json({ items });
  } catch (err) {
    console.error('Erro getExamesPaciente:', err);
    const status = parseStatusFromError(err);
    return res.status(status).json({ error: 'Erro ao buscar exames.' });
  }
}

// Observação
export async function postObservacaoPaciente(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).json({ error: 'Sem token.' });

    const { patientId } = req.params;
    const note = String(req.body?.note || '').trim();
    if (!note) return res.status(400).json({ error: 'Observação não pode estar vazia.' });

    const result = await apiPost(`/patients/${patientId}/observations`, token, { note });
    return res.status(201).json({ ok: true, data: result });
  } catch (err) {
    console.error('Erro postObservacaoPaciente:', err);
    const status = parseStatusFromError(err);
    return res.status(status).json({ error: 'Erro ao salvar observação.' });
  }
}

// Finalizar -> PATCH /appointments/:id/status {status:"COMPLETED"}
export async function finalizarConsulta(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).json({ ok: false, message: 'Sem token.' });

    const { appointmentId } = req.params;
    const payload = await apiPatch(`/appointments/${appointmentId}/status`, token, { status: 'COMPLETED' });

    return res.json({ ok: true, data: payload || { status: 'COMPLETED' } });
  } catch (err) {
    console.error('Erro finalizarConsulta:', err);
    const status = parseStatusFromError(err);
    return res.status(status).json({ ok: false, message: 'Não foi possível finalizar. A consulta precisa estar CONFIRMED.' });
  }
}
