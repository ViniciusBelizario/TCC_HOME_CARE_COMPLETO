// src/routes/users.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth');
const UserController = require('../controllers/UserController');

// Lista usuários (pacientes)
router.get('/admin/usuarios', requireAuth, UserController.viewUsers);

// Tela "novo usuário"
router.get('/admin/usuarios/novo', requireAuth, UserController.viewNewUser);

// Recebe o POST do form "novo usuário"
router.post('/admin/usuarios', requireAuth, UserController.createUser);

module.exports = router;
