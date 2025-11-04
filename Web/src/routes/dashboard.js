const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth');
const DashboardController = require('../controllers/DashboardController');

// Protegido por autenticação
router.get('/admin/dashboard', requireAuth, DashboardController.viewDashboard);

module.exports = router;
