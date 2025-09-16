const { Router } = require('express');
const { models: { User, PatientProfile, ExamResult } } = require('../db');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { logAction } = require('../utils/audit');

const router = Router();

router.get('/', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  try {
    const q = String(req.query.q || '').toLowerCase();
    const patients = await User.findAll({
      where: { role: 'PACIENTE' },
      include: [{ model: PatientProfile, as: 'patientProfile' }]
    });
    const filtered = q
      ? patients.filter(p =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.cpf && p.cpf.includes(q)))
      : patients;

    await logAction(req, { action: 'PATIENT_LIST', entityType: 'USER', entityId: null, meta: { q } });

    res.json(filtered);
  } catch (e) { next(e); }
});

router.get('/:id', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const patient = await User.findOne({
      where: { id, role: 'PACIENTE' },
      include: [
        { model: PatientProfile, as: 'patientProfile' },
        { model: ExamResult, as: 'patientExams' }
      ]
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    await logAction(req, { action: 'PATIENT_VIEW', entityType: 'USER', entityId: id });

    res.json(patient);
  } catch (e) { next(e); }
});

router.put('/:id', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, email, cpf, phone, address, birthDate } = req.body;

    const patient = await User.findOne({ where: { id, role: 'PACIENTE' } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    if (name || email || cpf) {
      if (name) patient.name = name;
      if (email) patient.email = email;
      if (cpf) patient.cpf = cpf;
      await patient.save();
    }

    const prof = await PatientProfile.findOne({ where: { userId: id } });
    if (prof) {
      if (phone !== undefined) prof.phone = phone;
      if (address !== undefined) prof.address = address;
      if (birthDate !== undefined) prof.birthDate = birthDate ? new Date(birthDate) : null;
      await prof.save();
    }

    await logAction(req, { action: 'PATIENT_UPDATE', entityType: 'USER', entityId: id, meta: { changed: Object.keys(req.body || {}) } });

    const updated = await User.findByPk(id, { include: ['patientProfile'] });
    res.json(updated);
  } catch (e) { next(e); }
});

module.exports = router;
