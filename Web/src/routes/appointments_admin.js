// src/routes/appointments_admin.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const C = require('../controllers/AppointmentsAdminController');

// quem pode confirmar agenda? Admin + Atendente
const protect = [requireAuth, requireRole(['ADMIN', 'ATENDENTE'])];

router.get('/admin/usuarios/agenda', protect, C.viewDoctorAgenda);
router.post('/admin/usuarios/agenda/confirm', protect, C.confirmAppointment);

module.exports = router;
