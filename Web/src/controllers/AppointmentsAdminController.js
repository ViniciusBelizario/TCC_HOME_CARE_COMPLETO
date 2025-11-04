// src/controllers/AppointmentsAdminController.js
const api = require('../services/api');

exports.viewDoctorAgenda = async (req, res) => {
  try {
    const doctorId = (req.query.doctorId || '').trim();
    let items = [];
    let msg = req.query.msg || null, error = null;

    if (doctorId) {
      try {
        items = await api.getDoctorAppointments(req, { doctorId });
      } catch (e) {
        error = e.message || 'Falha ao carregar agenda.';
      }
    }

    res.render('users/agenda', { active: 'users', doctorId, items, msg, error });
  } catch (err) {
    res.status(500).render('users/agenda', {
      active: 'users', doctorId: '', items: [], msg: null,
      error: err.message || 'Erro ao exibir agenda.'
    });
  }
};

exports.confirmAppointment = async (req, res) => {
  try {
    const { appointmentId, doctorId } = req.body;
    if (!appointmentId) throw new Error('Informe o ID da consulta.');
    await api.updateAppointmentStatus(req, { appointmentId, status: 'CONFIRMED' });
    res.redirect(`/admin/usuarios/agenda?doctorId=${encodeURIComponent(doctorId||'')}&msg=${encodeURIComponent('Consulta confirmada!')}`);
  } catch (err) {
    const doctorId = req.body?.doctorId || '';
    res.redirect(`/admin/usuarios/agenda?doctorId=${encodeURIComponent(doctorId)}&msg=${encodeURIComponent('Falha: ' + (err.message || 'erro'))}`);
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { appointmentId, doctorId } = req.body;
    if (!appointmentId) throw new Error('Informe o ID da consulta.');
    await api.updateAppointmentStatus(req, { appointmentId, status: 'CANCELED' });
    res.redirect(`/admin/usuarios/agenda?doctorId=${encodeURIComponent(doctorId||'')}&msg=${encodeURIComponent('Consulta cancelada!')}`);
  } catch (err) {
    const doctorId = req.body?.doctorId || '';
    res.redirect(`/admin/usuarios/agenda?doctorId=${encodeURIComponent(doctorId)}&msg=${encodeURIComponent('Falha: ' + (err.message || 'erro'))}`);
  }
};
