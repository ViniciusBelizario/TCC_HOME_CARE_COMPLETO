const { Router } = require('express');
const { models: { Appointment, User } } = require('../db');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { stringify } = require('csv-stringify');

const router = Router();

/** Relatórios de consultas:
 *  - MEDICO/ATENDENTE: DETALHADO (com nomes de pacientes)
 *  - ADMIN: APENAS RESUMO agregado por médico/status (sem dados do paciente)
 */
router.get('/appointments', auth(), requireRole('MEDICO', 'ATENDENTE', 'ADMIN'), async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const format = String(req.query.format || 'json');
    const doctorIdParam = req.query.doctorId ? Number(req.query.doctorId) : undefined;

    // Base rows
    const rows = await Appointment.findAll({
      order: [['startsAt', 'ASC']],
      include: [
        { model: User, as: 'doctor', attributes: ['id', 'name'] },
        { model: User, as: 'patient', attributes: ['id', 'name'] }
      ]
    });

    // Filtros de data/medico
    const filtered = rows.filter(r =>
      (!from || r.startsAt >= from) &&
      (!to || r.endsAt <= to) &&
      (!doctorIdParam || r.doctorId === doctorIdParam)
    );

    // Papel decide o formato/colunas
    if (req.user.role === 'MEDICO' || req.user.role === 'ATENDENTE') {
      const data = filtered.map(d => ({
        id: d.id,
        medicoId: d.doctor?.id,
        medico: d.doctor?.name || '',
        pacienteId: d.patient?.id,
        paciente: d.patient?.name || '',
        inicio: d.startsAt.toISOString(),
        fim: d.endsAt.toISOString(),
        status: d.status,
        observacoes: d.notes || ''
      }));

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio-consultas-detalhado.csv"');
        stringify(data, { header: true }).pipe(res);
        return;
      }
      return res.json(data);
    }

    // ADMIN -> agregado sem paciente
    const agg = {};
    for (const d of filtered) {
      const key = `${d.doctorId}|${d.doctor?.name || ''}`;
      agg[key] = agg[key] || { doctorId: d.doctorId, doctor: d.doctor?.name || '', PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0, total: 0 };
      agg[key][d.status] = (agg[key][d.status] || 0) + 1;
      agg[key].total += 1;
    }
    const summary = Object.values(agg);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio-consultas-agg.csv"');
      stringify(summary, { header: true }).pipe(res);
      return;
    }
    res.json(summary);
  } catch (e) { next(e); }
});

module.exports = router;
