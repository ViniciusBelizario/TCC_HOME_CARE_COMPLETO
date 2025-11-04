// src/controllers/AvailabilityController.js
const api = require('../services/api');

const ensureDoctors = async (req) => {
  const doctors = await api.listDoctors(req, req.query.q || '');
  return (doctors || []).map(d => ({
    id: d.id,
    name: d.name,
    specialty: d.doctorProfile?.specialty || '',
    crm: d.doctorProfile?.crm || '',
  }));
};

exports.menu = async (req, res) => {
  res.render('admin/agendamento_menu', { active: 'appointments' });
};

// ----- criar horário específico -----
exports.viewCreateSingle = async (req, res) => {
  const doctors = await ensureDoctors(req);
  res.render('admin/agendamento_novo', { active: 'appointments', doctors, error: null, ok: null });
};

exports.createSingle = async (req, res) => {
  try {
    const { doctorId, startsAt, endsAt } = req.body;
    await api.createAvailability(req, { doctorId: Number(doctorId), startsAt, endsAt });
    const doctors = await ensureDoctors(req);
    res.render('admin/agendamento_novo', { active: 'appointments', doctors, ok: 'Horário criado com sucesso!', error: null });
  } catch (err) {
    const doctors = await ensureDoctors(req);
    res.status(err.status || 400).render('admin/agendamento_novo', {
      active: 'appointments',
      doctors,
      error: err.message || 'Falha ao criar horário.',
      ok: null,
    });
  }
};

// ----- criar horários em lote (um dia) -----
exports.viewCreateBatch = async (req, res) => {
  const doctors = await ensureDoctors(req);
  res.render('admin/agendamento_lote', { active: 'appointments', doctors, error: null, ok: null });
};

exports.createBatch = async (req, res) => {
  try {
    const { doctorId, date, startTime, endTime, durationMin } = req.body;
    await api.createDayOpenings(req, {
      doctorId: Number(doctorId),
      date,
      startTime,
      endTime,
      durationMin: Number(durationMin),
    });
    const doctors = await ensureDoctors(req);
    res.render('admin/agendamento_lote', { active: 'appointments', doctors, ok: 'Agenda do dia criada!', error: null });
  } catch (err) {
    const doctors = await ensureDoctors(req);
    res.status(err.status || 400).render('admin/agendamento_lote', {
      active: 'appointments', doctors, error: err.message || 'Falha ao criar agenda em lote.', ok: null,
    });
  }
};

// ----- listar / apagar / apagar range / confirmar -----
exports.viewList = async (req, res) => {
  try {
    const doctors = await ensureDoctors(req);
    let { doctorId, from, to } = req.query;
    let items = [];
    if (doctorId && from && to) {
      items = await api.listAvailability(req, { doctorId, from, to });
    }
    res.render('admin/agendamento_listar', {
      active: 'appointments',
      doctors,
      items: items || [],
      filters: { doctorId: doctorId || '', from: from || '', to: to || '' },
      error: null,
      ok: null,
    });
  } catch (err) {
    const doctors = await ensureDoctors(req);
    res.status(400).render('admin/agendamento_listar', {
      active: 'appointments',
      doctors,
      items: [],
      filters: { doctorId: '', from: '', to: '' },
      error: err.message || 'Erro ao listar.',
      ok: null,
    });
  }
};

exports.deleteOne = async (req, res) => {
  try {
    await api.deleteAvailability(req, req.params.id);
    res.redirect('back');
  } catch (err) {
    console.error('deleteOne:', err);
    res.redirect('back');
  }
};

exports.deleteRange = async (req, res) => {
  try {
    const { doctorId, from, to } = req.body;
    await api.deleteUnusedRange(req, { doctorId: Number(doctorId), from, to });
    res.redirect('back');
  } catch (err) {
    console.error('deleteRange:', err);
    res.redirect('back');
  }
};

exports.confirmAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    await api.updateAppointmentStatus(req, { appointmentId, status: 'CONFIRMED' });
    res.redirect('back');
  } catch (err) {
    console.error('confirmAppointment:', err);
    res.redirect('back');
  }
};

exports.viewConfirm = (req, res) => {
  res.render('admin/agendamento_confirmar', { active: 'appointments-confirm', error: null, ok: null });
};

exports.viewCancel = (req, res) => {
  res.render('admin/agendamento_cancelar', { active: 'appointments-cancel', error: null, ok: null });
};

exports.cancelAppointment = async (req, res) => {
  const { appointmentId } = req.body;
  try {
    await api.updateAppointmentStatus(req, { appointmentId, status: 'CANCELLED' });
    res.render('admin/agendamento_cancelar', { active: 'appointments-cancel', ok: 'Consulta cancelada!', error: null });
  } catch (e) {
    res.status(400).render('admin/agendamento_cancelar', { active: 'appointments-cancel', ok: null, error: e.message || 'Falha ao cancelar' });
  }
};