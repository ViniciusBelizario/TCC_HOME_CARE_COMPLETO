// src/controllers/DashboardController.js
const api = require('../services/api');

exports.viewDashboard = async (req, res) => {
  try {
    // Exemplo de dados mockados — depois podemos integrar com o backend real
    const stats = {
      totalUsers: 15,
      scheduled: 8,
      finished: 5,
    };

    const pendings = [
      { user: 'Maria Oliveira', service: 'Consulta Geriátrica', date: '2025-10-28', time: '10:00' },
      { user: 'João Pereira', service: 'Curativo Domiciliar', date: '2025-10-29', time: '09:30' },
    ];

    res.render('admin/dashboard', {
      active: 'dashboard',
      stats,
      pendings,
    });
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
    res.status(500).send('Erro ao carregar dashboard.');
  }
};
