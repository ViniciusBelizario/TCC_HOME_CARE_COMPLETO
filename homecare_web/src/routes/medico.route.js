// src/routes/medico.route.js
import { Router } from 'express';
import { ensureAuth, allowRoles } from '../middlewares/auth.middleware.js';
import {
  getPacientesHojePage,
  getPacientesHojeJson,
  getExamesPaciente,
  postObservacaoPaciente,
  finalizarConsulta,          // <- NOVO
} from '../controllers/medico.controller.js';

const router = Router();

router.use(ensureAuth);

// Página principal
router.get('/pacientes-hoje', allowRoles('medico', 'admin'), getPacientesHojePage);
// Lista JSON
router.get('/pacientes-hoje/_list.json', allowRoles('medico', 'admin'), getPacientesHojeJson);
// Exames do paciente
router.get('/pacientes/:patientId/exams', allowRoles('medico', 'admin'), getExamesPaciente);
// Nova observação
router.post('/pacientes/:patientId/observations', allowRoles('medico', 'admin'), postObservacaoPaciente);
// Finalizar consulta (proxy PATCH -> POST com body)
router.post('/consultas/:appointmentId/finalizar', allowRoles('medico', 'admin'), finalizarConsulta);

export default router;
