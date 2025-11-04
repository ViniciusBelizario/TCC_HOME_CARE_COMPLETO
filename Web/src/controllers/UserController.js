// src/controllers/UserController.js
const api = require('../services/api');

exports.viewUsers = async (req, res) => {
  try {
    const q = req.query.q || '';
    const patients = await api.listPatients(req, q);

    const users = (patients || []).map(p => ({
      id: p.id,
      name: p.name || '—',
      cpf: p.cpf || '—',
      email: p.email || '—',
      role: (p.role || 'PACIENTE').toUpperCase(),
      phone: p.patientProfile?.phone || '—',
      address: p.patientProfile?.address || '—'
    }));

    res.render('admin/usuarios', { active: 'users', users, error: null });
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(err.status || 500).render('admin/usuarios', {
      active: 'users',
      error: 'Erro ao carregar lista de usuários',
      users: []
    });
  }
};

// Tela "Novo Usuário"
exports.viewNewUser = (req, res) => {
  res.render('admin/usuario_novo', { active: 'users', error: null });
};

// Recebe o POST do form e chama o back
exports.createUser = async (req, res) => {
  try {
    const { name, email, cpf, password, phone, address, birthDate } = req.body;

    // Monta payload que o back espera
    const payload = {
      name,
      email,
      cpf: (cpf || '').replace(/\D/g, ''),
      password,
      phone: phone || '',
      address: address || '',
      birthDate: birthDate || null, // 'YYYY-MM-DD'
    };

    await api.registerPatient(req, payload);

    // Sucesso → volta para a lista
    return res.redirect('/admin/usuarios');
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    return res.status(err.status || 400).render('admin/usuario_novo', {
      active: 'users',
      error: err.message || 'Falha ao cadastrar usuário. Verifique os dados.',
    });
  }
};
