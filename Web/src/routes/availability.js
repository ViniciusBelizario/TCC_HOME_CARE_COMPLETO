// src/routes/availability.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const C = require('../controllers/AvailabilityController');

// Apenas ADMIN/ATENDENTE podem gerir agendas
const protect = [requireAuth, requireRole('ADMIN', 'ATENDENTE')];

router.get('/admin/agendamentos', protect, C.menu);

// criar específico
router.get('/admin/agendamentos/novo', protect, C.viewCreateSingle);
router.post('/admin/agendamentos/novo', protect, C.createSingle);

// criar em lote (um dia)
router.get('/admin/agendamentos/lote', protect, C.viewCreateBatch);
router.post('/admin/agendamentos/lote', protect, C.createBatch);

// listar / operações
router.get('/admin/agendamentos/listar', protect, C.viewList);
router.post('/admin/agendamentos/apagar/:id', protect, C.deleteOne);
router.post('/admin/agendamentos/apagar-range', protect, C.deleteRange);

// confirmar consulta (appointment)
router.get('/admin/agendamentos/confirmar', protect, C.viewConfirm);
router.post('/admin/agendamentos/confirmar/:appointmentId', protect, C.confirmAppointment);

router.get('/admin/agendamentos/cancelar', protect, C.viewCancel);
router.post('/admin/agendamentos/cancelar', protect, C.cancelAppointment);

module.exports = router;
