// file: src/routes/doctors.routes.js
const { Router } = require('express');
const { models: { User, DoctorProfile } } = require('../db');
const { auth } = require('../middlewares/auth');

const router = Router();

router.get('/', auth(false), async (req, res, next) => {
  try {
    const q = String(req.query.q || '');
    const docs = await User.findAll({ where: { role: 'MEDICO' }, include: [{ model: DoctorProfile, as: 'doctorProfile' }] });
    const filtered = q
      ? docs.filter(d =>
          (d.name && d.name.includes(q)) ||
          (d.email && d.email.includes(q)) ||
          (d.doctorProfile && d.doctorProfile.crm && d.doctorProfile.crm.includes(q)))
      : docs;
    res.json(filtered);
  } catch (e) { next(e); }
});

module.exports = router;
