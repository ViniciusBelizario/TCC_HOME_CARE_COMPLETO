// src/controllers/agenda.controller.js
import { apiGet, apiPatch, apiPost } from '../services/api.service.js';

export const calendario = async (req, res) => {
  try {
    const token = req.session?.token;
    const doctors = await apiGet('/doctors', token);
    const medicos = (Array.isArray(doctors) ? doctors : []).map(d => ({
      id: d.id,
      nome: d.name
    }));

    res.render('agenda/index', {
      titulo: 'Agenda',
      medicos
    });
  } catch (e) {
    console.error('Erro ao listar médicos:', e);
    res.render('agenda/index', { titulo: 'Agenda', medicos: [] });
  }
};

// GET /agenda/data?doctorId=&from=&to=
export const getData = async (req, res) => {
  try {
    const token = req.session?.token;
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const { doctorId, from, to } = req.query;
    if (!doctorId) return res.status(400).json({ error: 'doctorId obrigatório' });

    const availability = await apiGet('/availability', token, {
      doctorId, ...(from ? { from } : {}), ...(to ? { to } : {})
    });

    const appointments = await apiGet(`/appointments/doctor/${doctorId}`, token, { from, to });

    res.json({ availability, appointments });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'agenda_proxy_error' });
  }
};

// POST /agenda/appointments/:id/confirm  -> confirma consulta
export const confirmAppointment = async (req, res) => {
  try {
    const token = req.session?.token;
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id obrigatório' });

    const data = await apiPatch(`/appointments/${id}/status`, token, { status: 'CONFIRMED' });
    res.json(data);
  } catch (e) {
    console.error('confirmAppointment error:', e);
    res.status(500).json({ error: 'confirm_error' });
  }
};

// POST /agenda/availability        -> disponibilizar específica
export const createAvailability = async (req, res) => {
  try {
    const token = req.session?.token;
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const body = req.body; // { doctorId, startsAt, endsAt }
    const data = await apiPost('/availability', token, body);
    res.json(data);
  } catch (e) {
    console.error('createAvailability error:', e);
    res.status(500).json({ error: 'availability_error' });
  }
};

// POST /agenda/availability/day-openings -> disponibilizar em lote
export const createDayOpenings = async (req, res) => {
  try {
    const token = req.session?.token;
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const body = req.body; // { doctorId, date, startTime, endTime, durationMin }
    const data = await apiPost('/availability/day-openings', token, body);
    res.json(data);
  } catch (e) {
    console.error('createDayOpenings error:', e);
    res.status(500).json({ error: 'day_openings_error' });
  }
};
