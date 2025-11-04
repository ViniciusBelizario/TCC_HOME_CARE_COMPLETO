// src/routes/agenda.route.js
import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.middleware.js';
import * as Agenda from '../controllers/agenda.controller.js';

const router = Router();

router.get('/', ensureAuth, Agenda.calendario);
router.get('/data', ensureAuth, Agenda.getData);

// confirmar consulta pendente
router.post('/appointments/:id/confirm', ensureAuth, Agenda.confirmAppointment);

// disponibilizar horários
router.post('/availability', ensureAuth, Agenda.createAvailability);
router.post('/availability/day-openings', ensureAuth, Agenda.createDayOpenings);

export default router;
