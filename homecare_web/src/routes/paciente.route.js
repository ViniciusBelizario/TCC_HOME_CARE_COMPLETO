// src/routes/paciente.route.js
import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.middleware.js';
import * as Paciente from '../controllers/paciente.controller.js';

const router = Router();

// Tela + lista
router.get('/', ensureAuth, Paciente.listarPacientes);

// Endpoint leve para auto-refresh
router.get('/_list.json', ensureAuth, Paciente.listarPacientesJson);

// Detalhe JSON
router.get('/:id', ensureAuth, Paciente.pacienteDetalhe);

// Criação (proxy)
router.post('/', ensureAuth, Paciente.criarPaciente);

export default router;
