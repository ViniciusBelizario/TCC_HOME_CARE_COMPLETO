// src/controllers/ReportsController.js
const api = require('../services/api');

function toISO(input) {
  if (!input) return '';
  const v = String(input).trim();
  if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(v)) return v; // já tem timezone
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)) return v; // datetime-local
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00`;
  const d = new Date(v);
  return isNaN(d) ? v : d.toISOString();
}

exports.menu = (_req, res) => {
  res.render('relatorios/index', { active: 'reports' });
};

// KPIs gerais
exports.viewKpis = async (req, res) => {
  try {
    const fromISO = toISO(req.query.from || '');
    const toISOv  = toISO(req.query.to || '');
    const has = !!(fromISO && toISOv);
    const data = has ? await api.getReportKpis(req, { from: fromISO, to: toISOv }) : null;

    res.render('relatorios/kpis', {
      active: 'reports',
      filters: { from: req.query.from || '', to: req.query.to || '' },
      data,
      error: null
    });
  } catch (err) {
    res.status(err.status || 500).render('relatorios/kpis', {
      active: 'reports',
      filters: { from: req.query.from || '', to: req.query.to || '' },
      data: null,
      error: err.message || 'Falha ao carregar KPIs.'
    });
  }
};

// Consultas por DIA (agregado simples)
exports.viewApptAggregate = async (req, res) => {
  try {
    const fromISO = toISO(req.query.from || '');
    const toISOv  = toISO(req.query.to || '');
    const { doctorId = '', format = 'json' } = req.query;
    const has = !!(fromISO && toISOv);

    const data = has
      ? await api.getAppointmentsAggregate(req, { from: fromISO, to: toISOv, doctorId, format })
      : [];

    res.render('relatorios/aggregate_day', {
      active: 'reports',
      filters: { from: req.query.from || '', to: req.query.to || '', doctorId, format },
      items: data || [],
      error: null
    });
  } catch (err) {
    res.status(err.status || 500).render('relatorios/aggregate_day', {
      active: 'reports',
      filters: { ...req.query },
      items: [],
      error: err.message || 'Falha ao carregar agregado por dia.'
    });
  }
};

// Utilização por médico
exports.viewUtilization = async (req, res) => {
  try {
    const fromISO = toISO(req.query.from || '');
    const toISOv  = toISO(req.query.to || '');
    const { format = 'json' } = req.query;
    const has = !!(fromISO && toISOv);

    const data = has
      ? await api.getDoctorsUtilization(req, { from: fromISO, to: toISOv, format })
      : [];

    res.render('relatorios/utilization', {
      active: 'reports',
      filters: { from: req.query.from || '', to: req.query.to || '', format },
      items: data || [],
      error: null
    });
  } catch (err) {
    res.status(err.status || 500).render('relatorios/utilization', {
      active: 'reports',
      filters: { ...req.query },
      items: [],
      error: err.message || 'Falha ao carregar utilização por médico.'
    });
  }
};

// Retenção de pacientes
exports.viewRetention = async (req, res) => {
  try {
    const fromISO = toISO(req.query.from || '');
    const toISOv  = toISO(req.query.to || '');
    const baselineFromISO = toISO(req.query.baselineFrom || '');
    const baselineToISO   = toISO(req.query.baselineTo   || '');
    const has = !!(fromISO && toISOv && baselineFromISO && baselineToISO);

    const data = has
      ? await api.getPatientsRetention(req, {
          from: fromISO, to: toISOv, baselineFrom: baselineFromISO, baselineTo: baselineToISO
        })
      : null;

    res.render('relatorios/retention', {
      active: 'reports',
      filters: {
        from: req.query.from || '', to: req.query.to || '',
        baselineFrom: req.query.baselineFrom || '', baselineTo: req.query.baselineTo || ''
      },
      data,
      error: null
    });
  } catch (err) {
    res.status(err.status || 500).render('relatorios/retention', {
      active: 'reports',
      filters: { ...req.query },
      data: null,
      error: err.message || 'Falha ao carregar retenção de pacientes.'
    });
  }
};

// Consultas — detalhado/aggregado
exports.viewApptDetailed = async (req, res) => {
  try {
    const fromISO = toISO(req.query.from || '');
    const toISOv  = toISO(req.query.to || '');
    const { doctorId = '', format = 'json' } = req.query;
    const has = !!(fromISO && toISOv);

    const data = has
      ? await api.getAppointmentsDetailed(req, { from: fromISO, to: toISOv, doctorId, format })
      : [];

    res.render('relatorios/detailed', {
      active: 'reports',
      filters: { from: req.query.from || '', to: req.query.to || '', doctorId, format },
      items: data || [],
      error: null
    });
  } catch (err) {
    res.status(err.status || 500).render('relatorios/detailed', {
      active: 'reports',
      filters: { ...req.query },
      items: [],
      error: err.message || 'Falha ao carregar relatório detalhado.'
    });
  }
};
