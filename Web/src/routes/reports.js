// src/routes/reports.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const R = require('../controllers/ReportsController');

const protectAdmin = [requireAuth, requireRole('ADMIN')];

router.get('/admin/relatorios',                 protectAdmin, R.menu);
router.get('/admin/relatorios/kpis',            protectAdmin, R.viewKpis);
router.get('/admin/relatorios/consultas-dia',   protectAdmin, R.viewApptAggregate);
router.get('/admin/relatorios/utilizacao',      protectAdmin, R.viewUtilization);
router.get('/admin/relatorios/retencao',        protectAdmin, R.viewRetention);
router.get('/admin/relatorios/detalhado',       protectAdmin, R.viewApptDetailed);

module.exports = router;
