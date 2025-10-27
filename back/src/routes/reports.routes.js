// file: src/routes/reports.routes.js
const { Router } = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { stringify } = require('csv-stringify');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const {
  models: { Appointment, User, AvailabilitySlot, ExamResult }
} = require('../db');

const router = Router();

/**
 * Utils
 */
function toDateSafe(v) {
  if (!v) return undefined;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? undefined : d;
}

function setCSV(res, filename) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

const GRANULARITY = {
  day: '%Y-%m-%d',
  week: '%x-%v', // ISO week (MySQL)
  month: '%Y-%m'
};

function periodExpr(dateColumn, tzOffset, granularity) {
  const fmt = GRANULARITY[granularity] || GRANULARITY.day;
  const colName = typeof dateColumn === 'string' ? dateColumn : 'startsAt';
  const tz = typeof tzOffset === 'string' ? tzOffset : '+00:00';
  return literal(`DATE_FORMAT(CONVERT_TZ(${colName}, '+00:00', '${tz}'), '${fmt}')`);
}

function ensureModel(model, name) {
  if (!model) {
    const err = new Error(`${name} não está carregado nos models`);
    err.status = 501;
    throw err;
  }
}

function parseCommonQuery(req) {
  const from = toDateSafe(req.query.from);
  const to = toDateSafe(req.query.to);
  const tz = typeof req.query.tz === 'string' ? req.query.tz : '+00:00';
  const format = String(req.query.format || 'json').toLowerCase();
  const granularity = (req.query.granularity || 'day').toLowerCase();
  const doctorId = req.query.doctorId ? Number(req.query.doctorId) : undefined;
  // mantemos serviceId apenas se o seu Appointment tiver essa coluna;
  // não fazemos include pois não existe model Service.
  const serviceId = req.query.serviceId ? Number(req.query.serviceId) : undefined;
  return { from, to, tz, format, granularity, doctorId, serviceId };
}

/**
 * 1) KPIs gerais (ADMIN)
 * - totais por status
 * - duração média
 * - taxa de ocupação (AvailabilitySlot)
 * - receitaEstimativa: como não há Service, deixamos como null
 */
router.get('/kpis', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    ensureModel(Appointment, 'Appointment');
    const { from, to } = parseCommonQuery(req);

    const whereAppt = {};
    if (from) whereAppt.startsAt = { [Op.gte]: from };
    if (to) whereAppt.endsAt = { ...(whereAppt.endsAt || {}), [Op.lte]: to };

    const appts = await Appointment.findAll({
      where: whereAppt,
      attributes: [
        'id', 'status', 'startsAt', 'endsAt',
        [fn('TIMESTAMPDIFF', literal('MINUTE'), col('startsAt'), col('endsAt')), 'durationMin']
      ],
      raw: true
    });

    const kpi = {
      total: 0,
      requested: 0,
      accepted: 0,
      denied: 0,
      canceled: 0,
      completed: 0,
      avgDurationMin: null,
      revenueEstimated: null // sem Service/basePrice
    };

    let sumDuration = 0;
    let countDuration = 0;

    for (const a of appts) {
      kpi.total += 1;
      const st = String(a.status || '').toUpperCase();
      if (st === 'REQUESTED') kpi.requested += 1;
      else if (st === 'ACCEPTED') kpi.accepted += 1;
      else if (st === 'DENIED') kpi.denied += 1;
      else if (st === 'CANCELED') kpi.canceled += 1;
      else if (st === 'COMPLETED') kpi.completed += 1;

      const d = Number(a.durationMin);
      if (Number.isFinite(d) && d > 0) {
        sumDuration += d;
        countDuration += 1;
      }
    }
    kpi.avgDurationMin = countDuration ? Math.round(sumDuration / countDuration) : null;

    // Ocupação com AvailabilitySlot (se existir)
    try {
      ensureModel(AvailabilitySlot, 'AvailabilitySlot');
      const whereSlot = {};
      if (from) whereSlot.startsAt = { [Op.gte]: from };
      if (to) whereSlot.endsAt = { ...(whereSlot.endsAt || {}), [Op.lte]: to };

      const slots = await AvailabilitySlot.findAll({
        where: whereSlot,
        attributes: [
          [fn('SUM', fn('TIMESTAMPDIFF', literal('MINUTE'), col('startsAt'), col('endsAt'))), 'totalMin'],
          [fn('SUM', literal(`CASE WHEN isBooked THEN TIMESTAMPDIFF(MINUTE, startsAt, endsAt) ELSE 0 END`)), 'bookedMin']
        ],
        raw: true
      });

      const totalMin = Number(slots[0]?.totalMin || 0);
      const bookedMin = Number(slots[0]?.bookedMin || 0);
      kpi.utilizationRate = totalMin > 0 ? bookedMin / totalMin : null;
    } catch {
      kpi.utilizationRate = null;
    }

    return res.json(kpi);
  } catch (e) { next(e); }
});

/**
 * 2) Consultas por período (ADMIN): agrupa por dia/semana/mês e por médico
 * (mantemos serviceId se existir na tabela, mas sem join)
 */
router.get('/appointments/aggregate', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    ensureModel(Appointment, 'Appointment');
    const { from, to, tz, granularity, format, doctorId, serviceId } = parseCommonQuery(req);

    const period = periodExpr('startsAt', tz, granularity);
    const whereAppt = {};
    if (from) whereAppt.startsAt = { [Op.gte]: from };
    if (to) whereAppt.endsAt = { ...(whereAppt.endsAt || {}), [Op.lte]: to };
    if (doctorId) whereAppt.doctorId = doctorId;
    if (serviceId) whereAppt.serviceId = serviceId;

    const rows = await Appointment.findAll({
      where: whereAppt,
      attributes: [
        [period, 'period'],
        'doctorId',
        ...(serviceId !== undefined ? ['serviceId'] : ['serviceId']), // mantemos serviceId se existir
        [fn('SUM', literal(`CASE WHEN status='REQUESTED' THEN 1 ELSE 0 END`)), 'requested'],
        [fn('SUM', literal(`CASE WHEN status='ACCEPTED' THEN 1 ELSE 0 END`)), 'accepted'],
        [fn('SUM', literal(`CASE WHEN status='DENIED' THEN 1 ELSE 0 END`)), 'denied'],
        [fn('SUM', literal(`CASE WHEN status='CANCELED' THEN 1 ELSE 0 END`)), 'canceled'],
        [fn('SUM', literal(`CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END`)), 'completed'],
        [fn('COUNT', col('id')), 'total'],
        [fn('AVG', fn('TIMESTAMPDIFF', literal('MINUTE'), col('startsAt'), col('endsAt'))), 'avgDurationMin']
      ],
      group: ['period', 'doctorId', 'serviceId'],
      order: [[literal('period'), 'ASC']]
    });

    // nomes dos médicos (sem join pesado)
    const docMap = {};
    if (rows.length) {
      try {
        ensureModel(User, 'User');
        const dIds = [...new Set(rows.map(r => r.get('doctorId')).filter(Boolean))];
        const docs = dIds.length ? await User.findAll({ where: { id: dIds }, attributes: ['id', 'name'] }) : [];
        for (const d of docs) docMap[d.id] = d.name;
      } catch {}
    }

    const data = rows.map(r => ({
      period: r.get('period'),
      doctorId: r.get('doctorId'),
      doctor: docMap[r.get('doctorId')] || null,
      serviceId: r.get('serviceId') ?? null, // só ID; sem nome/price
      requested: Number(r.get('requested') || 0),
      accepted: Number(r.get('accepted') || 0),
      denied: Number(r.get('denied') || 0),
      canceled: Number(r.get('canceled') || 0),
      completed: Number(r.get('completed') || 0),
      total: Number(r.get('total') || 0),
      avgDurationMin: r.get('avgDurationMin') != null ? Math.round(Number(r.get('avgDurationMin'))) : null,
      completionRate: Number(r.get('total') || 0) ? Number(r.get('completed') || 0) / Number(r.get('total')) : null
    }));

    if (format === 'csv') {
      setCSV(res, 'appointments_aggregate.csv');
      stringify(data, { header: true }).pipe(res);
      return;
    }
    return res.json(data);
  } catch (e) { next(e); }
});

/**
 * 3) Produtividade e utilização por médico (ADMIN)
 */
router.get('/doctors/utilization', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    ensureModel(Appointment, 'Appointment');
    ensureModel(AvailabilitySlot, 'AvailabilitySlot');
    const { from, to, format } = parseCommonQuery(req);

    const whereAppt = {};
    if (from) whereAppt.startsAt = { [Op.gte]: from };
    if (to) whereAppt.endsAt = { ...(whereAppt.endsAt || {}), [Op.lte]: to };

    const whereSlot = {};
    if (from) whereSlot.startsAt = { [Op.gte]: from };
    if (to) whereSlot.endsAt = { ...(whereSlot.endsAt || {}), [Op.lte]: to };

    const apptAgg = await Appointment.findAll({
      where: whereAppt,
      attributes: [
        'doctorId',
        [fn('COUNT', col('id')), 'appointments'],
        [fn('SUM', fn('TIMESTAMPDIFF', literal('MINUTE'), col('startsAt'), col('endsAt'))), 'minutesBooked']
      ],
      group: ['doctorId'],
      raw: true
    });

    const slotAgg = await AvailabilitySlot.findAll({
      where: whereSlot,
      attributes: [
        'doctorId',
        [fn('SUM', fn('TIMESTAMPDIFF', literal('MINUTE'), col('startsAt'), col('endsAt'))), 'minutesAvailable'],
        [fn('SUM', literal(`CASE WHEN isBooked THEN TIMESTAMPDIFF(MINUTE, startsAt, endsAt) ELSE 0 END`)), 'minutesBookedFlag']
      ],
      group: ['doctorId'],
      raw: true
    });

    const map = new Map();
    for (const a of apptAgg) {
      map.set(a.doctorId, {
        doctorId: a.doctorId,
        appointments: Number(a.appointments || 0),
        minutesBookedByAppt: Number(a.minutesBooked || 0),
        minutesAvailable: 0,
        minutesBookedBySlots: 0
      });
    }
    for (const s of slotAgg) {
      const row = map.get(s.doctorId) || {
        doctorId: s.doctorId,
        appointments: 0,
        minutesBookedByAppt: 0,
        minutesAvailable: 0,
        minutesBookedBySlots: 0
      };
      row.minutesAvailable = Number(s.minutesAvailable || 0);
      row.minutesBookedBySlots = Number(s.minutesBookedFlag || 0);
      map.set(s.doctorId, row);
    }

    // nome do médico
    const result = Array.from(map.values());
    try {
      ensureModel(User, 'User');
      const ids = result.map(r => r.doctorId).filter(Boolean);
      const docs = await User.findAll({ where: { id: ids }, attributes: ['id', 'name'] });
      const nameMap = new Map(docs.map(d => [d.id, d.name]));
      result.forEach(r => (r.doctor = nameMap.get(r.doctorId) || null));
    } catch {}

    result.forEach(r => {
      r.utilizationRate = r.minutesAvailable > 0 ? r.minutesBookedBySlots / r.minutesAvailable : null;
      r.avgApptsPerDay = null;
    });

    if (format === 'csv') {
      setCSV(res, 'doctors_utilization.csv');
      stringify(result, { header: true }).pipe(res);
      return;
    }
    return res.json(result);
  } catch (e) { next(e); }
});

/**
 * 4) Retenção de pacientes (ADMIN)
 */
router.get('/patients/retention', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    ensureModel(Appointment, 'Appointment');

    const from = toDateSafe(req.query.from);
    const to = toDateSafe(req.query.to);
    if (!from || !to || to <= from) {
      return res.status(400).json({ error: 'from/to inválidos' });
    }

    // Pacientes com consulta no período
    const appts = await Appointment.findAll({
      where: { startsAt: { [Op.gte]: from }, endsAt: { [Op.lte]: to } },
      attributes: ['patientId'],
      group: ['patientId'],
      raw: true
    });
    const patientIds = appts.map(a => a.patientId);

    // Primeira consulta histórica por paciente
    let newcomers = 0, returning = 0;
    if (patientIds.length) {
      const firsts = await Appointment.findAll({
        where: { patientId: patientIds },
        attributes: ['patientId', [fn('MIN', col('startsAt')), 'firstStart']],
        group: ['patientId'],
        raw: true
      });

      const firstMap = new Map(firsts.map(f => [f.patientId, new Date(f.firstStart)]));

      for (const pid of patientIds) {
        const first = firstMap.get(pid);
        if (first && first >= from && first <= to) newcomers++;
        else returning++;
      }
    }

    const result = { newcomers, returning };

    // churn opcional
    const baselineFrom = toDateSafe(req.query.baselineFrom);
    const baselineTo = toDateSafe(req.query.baselineTo);
    if (baselineFrom && baselineTo && baselineTo > baselineFrom) {
      const base = await Appointment.findAll({
        where: { startsAt: { [Op.gte]: baselineFrom }, endsAt: { [Op.lte]: baselineTo } },
        attributes: ['patientId'],
        group: ['patientId'],
        raw: true
      });
      const baseSet = new Set(base.map(b => b.patientId));
      const periodSet = new Set(patientIds);
      let churn = 0;
      for (const pid of baseSet) if (!periodSet.has(pid)) churn++;
      result.churnApprox = churn;
    }

    return res.json(result);
  } catch (e) { next(e); }
});

/**
 * 5) Exames (ADMIN): usa ExamResult + associação uploadedBy
 */
router.get('/exams/summary', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    ensureModel(ExamResult, 'ExamResult');
    const { from, to, format } = parseCommonQuery(req);

    const whereExam = {};
    if (from) whereExam.createdAt = { [Op.gte]: from };
    if (to) whereExam.createdAt = { ...(whereExam.createdAt || {}), [Op.lte]: to };

    // Por MIME
    const byMime = await ExamResult.findAll({
      where: whereExam,
      attributes: ['mimeType', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('size')), 'totalBytes']],
      group: ['mimeType'],
      raw: true
    });

    // Por papel do uploader
    const uploads = await ExamResult.findAll({
      where: whereExam,
      include: [{ association: ExamResult.associations.uploadedBy, attributes: ['role'] }],
      attributes: [],
      raw: true
    });
    const byRole = {};
    for (const u of uploads) {
      const role = u['uploadedBy.role'] || 'UNKNOWN';
      byRole[role] = (byRole[role] || 0) + 1;
    }

    const data = {
      byMime: byMime.map(r => ({
        mimeType: r.mimeType,
        count: Number(r.count || 0),
        totalMB: r.totalBytes ? +(Number(r.totalBytes) / (1024 * 1024)).toFixed(2) : 0
      })),
      byRole
    };

    if (format === 'csv') {
      setCSV(res, 'exams_summary.csv');
      stringify(
        data.byMime.map(x => ({ mimeType: x.mimeType, count: x.count, totalMB: x.totalMB })),
        { header: true }
      ).pipe(res);
      return;
    }
    return res.json(data);
  } catch (e) { next(e); }
});

/**
 * 6) Detalhado (MÉDICO/ATENDENTE) e agregado (ADMIN)
 * - sem Service; mantemos apenas serviceId se existir na tabela
 */
router.get('/appointments/detailed', auth(), requireRole('MEDICO', 'ATENDENTE', 'ADMIN'), async (req, res, next) => {
  try {
    ensureModel(Appointment, 'Appointment');
    const { from, to, format, doctorId, serviceId } = parseCommonQuery(req);

    const whereAppt = {};
    if (from) whereAppt.startsAt = { [Op.gte]: from };
    if (to) whereAppt.endsAt = { ...(whereAppt.endsAt || {}), [Op.lte]: to };
    if (doctorId) whereAppt.doctorId = doctorId;
    if (serviceId) whereAppt.serviceId = serviceId;

    const rows = await Appointment.findAll({
      where: whereAppt,
      order: [['startsAt', 'ASC']],
      include: [
        { association: Appointment.associations.doctor, attributes: ['id', 'name'] },
        { association: Appointment.associations.patient, attributes: ['id', 'name'] }
      ]
    });

    if (req.user.role === 'ADMIN') {
      const agg = {};
      for (const d of rows) {
        const key = `${d.doctorId}|${d.doctor?.name || ''}|${d.serviceId || ''}`;
        if (!agg[key]) {
          agg[key] = {
            doctorId: d.doctorId,
            doctor: d.doctor?.name || '',
            serviceId: d.serviceId || null,
            requested: 0, accepted: 0, denied: 0, canceled: 0, completed: 0,
            total: 0
          };
        }
        const st = String(d.status || '').toUpperCase();
        const k = st.toLowerCase();
        agg[key][k] = (agg[key][k] || 0) + 1;
        agg[key].total += 1;
      }
      const summary = Object.values(agg);

      if (format === 'csv') {
        setCSV(res, 'appointments_admin_agg.csv');
        stringify(summary, { header: true }).pipe(res);
        return;
      }
      return res.json(summary);
    }

    // Médico/Atendente: detalhado com paciente (sem Service)
    const data = rows.map(d => ({
      id: d.id,
      doctorId: d.doctor?.id,
      doctor: d.doctor?.name || '',
      patientId: d.patient?.id,
      patient: d.patient?.name || '',
      serviceId: d.serviceId || null, // só ID, se existir
      startsAt: d.startsAt?.toISOString?.() || null,
      endsAt: d.endsAt?.toISOString?.() || null,
      status: d.status,
      notes: d.notes || ''
    }));

    if (format === 'csv') {
      setCSV(res, 'appointments_detailed.csv');
      stringify(data, { header: true }).pipe(res);
      return;
    }
    return res.json(data);
  } catch (e) { next(e); }
});

module.exports = router;
