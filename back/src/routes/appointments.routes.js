const { Router } = require('express');
const { models: { AvailabilitySlot, Appointment, User } } = require('../db');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { logAction } = require('../utils/audit');

const router = Router();

router.post('/', auth(), requireRole('PACIENTE', 'ATENDENTE'), async (req, res, next) => {
  const t = await Appointment.sequelize.transaction();
  try {
    const { slotId, notes, patientId } = req.body;
    const slot = await AvailabilitySlot.findByPk(Number(slotId), { transaction: t, lock: t.LOCK.UPDATE });
    if (!slot || slot.isBooked) { await t.rollback(); return res.status(400).json({ error: 'Slot inválido' }); }

    let targetPatientId;
    if (req.user.role === 'PACIENTE') {
      targetPatientId = req.user.id;
      if (patientId && Number(patientId) !== req.user.id) { await t.rollback(); return res.status(403).json({ error: 'Paciente só agenda para si' }); }
    } else {
      if (!patientId) { await t.rollback(); return res.status(400).json({ error: 'patientId é obrigatório para atendente' }); }
      const pat = await User.findByPk(Number(patientId));
      if (!pat || pat.role !== 'PACIENTE') { await t.rollback(); return res.status(400).json({ error: 'patientId inválido' }); }
      targetPatientId = pat.id;
    }

    slot.isBooked = true; await slot.save({ transaction: t });
    const appt = await Appointment.create({
      patientId: targetPatientId, doctorId: slot.doctorId,
      startsAt: slot.startsAt, endsAt: slot.endsAt, notes: notes || null, status: 'PENDING'
    }, { transaction: t });

    await t.commit();

    await logAction(req, { action: 'APPOINTMENT_CREATE', entityType: 'APPOINTMENT', entityId: appt.id, meta: { slotId: slot.id, doctorId: slot.doctorId, patientId: targetPatientId } });

    res.status(201).json(appt);
  } catch (e) { await t.rollback(); next(e); }
});

router.get('/my', auth(), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const where = { ...(status ? { status } : {}) };
    if (req.user.role === 'PACIENTE') where.patientId = req.user.id;
    if (req.user.role === 'MEDICO') where.doctorId = req.user.id;

    const items = await Appointment.findAll({
      where, order: [['startsAt', 'ASC']],
      include: [
        { model: User, as: 'doctor', attributes: ['id', 'name'] },
        { model: User, as: 'patient', attributes: ['id', 'name'] }
      ]
    });

    await logAction(req, { action: 'APPOINTMENT_LIST_MY', entityType: null, entityId: null, meta: { role: req.user.role, status: status || null } });

    res.json(items);
  } catch (e) { next(e); }
});

router.get('/doctor/:doctorId', auth(), requireRole('ATENDENTE', 'MEDICO'), async (req, res, next) => {
  try {
    const doctorId = Number(req.params.doctorId);
    if (req.user.role === 'MEDICO' && req.user.id !== doctorId) {
      return res.status(403).json({ error: 'Médico só acessa a própria agenda' });
    }
    const status = req.query.status ? String(req.query.status) : undefined;
    const where = { doctorId, ...(status ? { status } : {}) };

    const items = await Appointment.findAll({
      where, order: [['startsAt', 'ASC']],
      include: [
        { model: User, as: 'doctor', attributes: ['id', 'name'] },
        { model: User, as: 'patient', attributes: ['id', 'name'] }
      ]
    });

    await logAction(req, { action: 'APPOINTMENT_LIST_DOCTOR', entityType: 'USER', entityId: doctorId, meta: { status: status || null } });

    res.json(items);
  } catch (e) { next(e); }
});

router.patch('/:id/status', auth(), requireRole('PACIENTE', 'ATENDENTE', 'MEDICO'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const appt = await Appointment.findByPk(id);
    if (!appt) return res.status(404).json({ error: 'Consulta não encontrada' });

    const prev = appt.status;

    if (req.user.role === 'ATENDENTE') {
      const allowed = ['CONFIRMED', 'CANCELLED'];
      if (!allowed.includes(status)) return res.status(400).json({ error: 'Transição não permitida para atendente' });
      if (appt.status !== 'PENDING') return res.status(400).json({ error: 'Só consultas PENDING podem ser confirmadas/canceladas pelo atendente' });
    } else if (req.user.role === 'MEDICO') {
      const allowed = ['COMPLETED', 'CANCELLED'];
      if (!allowed.includes(status)) return res.status(400).json({ error: 'Transição não permitida para médico' });
      if (appt.doctorId !== req.user.id) return res.status(403).json({ error: 'Médico só altera suas consultas' });
      if (appt.status !== 'CONFIRMED') return res.status(400).json({ error: 'Só consultas CONFIRMED podem ser finalizadas/canceladas pelo médico' });
    } else if (req.user.role === 'PACIENTE') {
      if (status !== 'CANCELLED') return res.status(400).json({ error: 'Paciente só pode cancelar' });
      if (appt.patientId !== req.user.id) return res.status(403).json({ error: 'Paciente só altera suas consultas' });
      if (appt.status !== 'PENDING') return res.status(400).json({ error: 'Paciente só pode cancelar antes da confirmação' });
    }

    appt.status = status; await appt.save();

    await logAction(req, { action: 'APPOINTMENT_STATUS_UPDATE', entityType: 'APPOINTMENT', entityId: appt.id, meta: { from: prev, to: status } });

    res.json(appt);
  } catch (e) { next(e); }
});

module.exports = router;
