const { Router } = require('express');
const { models: { AvailabilitySlot, User } } = require('../db');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { toUTC } = require('../utils/dates');
const { Op } = require('sequelize');

const router = Router();

/** Criar slot – MEDICO (para si) ou ATENDENTE (para um médico via doctorId) */
router.post('/', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  try {
    const { startsAt, endsAt, doctorId } = req.body;
    const start = toUTC(startsAt);
    const end = toUTC(endsAt);
    if (!start || !end || end <= start) return res.status(400).json({ error: 'Intervalo inválido' });

    let targetDoctorId;
    if (req.user.role === 'MEDICO') {
      targetDoctorId = req.user.id;
      if (doctorId && Number(doctorId) !== req.user.id) return res.status(403).json({ error: 'Médico só pode criar slots para si' });
    } else {
      // ATENDENTE deve indicar o médico
      if (!doctorId) return res.status(400).json({ error: 'doctorId é obrigatório para atendente' });
      const doc = await User.findByPk(Number(doctorId));
      if (!doc || doc.role !== 'MEDICO') return res.status(400).json({ error: 'doctorId inválido' });
      targetDoctorId = doc.id;
    }

    const overlap = await AvailabilitySlot.findOne({
      where: {
        doctorId: targetDoctorId,
        startsAt: { [Op.lt]: end },
        endsAt: { [Op.gt]: start }
      }
    });
    if (overlap) return res.status(400).json({ error: 'Já existe um slot nesse intervalo' });

    const slot = await AvailabilitySlot.create({ doctorId: targetDoctorId, startsAt: start, endsAt: end });
    res.status(201).json(slot);
  } catch (e) { next(e); }
});

/** Listar slots (público) – filtro por médico e período */
router.get('/', auth(false), async (req, res, next) => {
  try {
    const doctorId = req.query.doctorId ? Number(req.query.doctorId) : undefined;
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const where = {
      ...(doctorId ? { doctorId } : {}),
      ...(from ? { startsAt: { [Op.gte]: from } } : {}),
      ...(to ? { endsAt: { [Op.lte]: to } } : {}),
      isBooked: false
    };

    const slots = await AvailabilitySlot.findAll({ where, order: [['startsAt', 'ASC']] });
    res.json(slots);
  } catch (e) { next(e); }
});

module.exports = router;
