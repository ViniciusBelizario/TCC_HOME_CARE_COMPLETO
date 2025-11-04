// src/routes/paciente.route.js
import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.middleware.js';
import * as Paciente from '../controllers/paciente.controller.js';

const router = Router();

// Lista + tela
router.get('/', ensureAuth, Paciente.listarPacientes);

// Detalhe JSON (usado pelo fetch do front)
router.get('/:id', ensureAuth, Paciente.pacienteDetalhe);

// Criação (proxy para a API)
router.post('/', ensureAuth, Paciente.criarPaciente);

export default router;
