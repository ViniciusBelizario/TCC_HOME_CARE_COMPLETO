const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mime = require('mime-types');

const { ensureAuth, ensureRole } = require('../middlewares/auth');
const { listUsers, createUser, listAppointments } = require('../services/api');

const router = express.Router();

/* ====== FALLBACK MOCKS (usados somente se a API falhar) ====== */
const mockUsers = [
  { id: 1, cpf:'11144477735', name:'Maria Pereira',  email:'maria.pereira@example.com', role:'USUARIO',  birth:'1989-03-12' },
  { id: 2, cpf:'99988877766', name:'Juliana Costa',  email:'juliana.costa@example.com', role:'MEDICO',   birth:'1985-05-30' },
  { id: 3, cpf:'12345678909', name:'Jorge Cardoso',  email:'jorge.cardoso@example.com', role:'ATENDENTE', birth:'1990-02-01' },
];

const mockAppointments = [
  { user:'Maria Pereira', service:'Avaliação', date:'27/04/2024', time:'10:00' },
  { user:'Lucas Moraes',  service:'Fisioterapia', date:'27/04/2024', time:'15:20' },
];

const stats = { totalUsers: 258, scheduled: 134, finished: 36 };

/* ====== UPLOAD (por CPF) ====== */
const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { cpf } = req.params;
    const dir = path.join(UPLOADS_ROOT, cpf);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = mime.extension(file.mimetype) || 'bin';
    const base = file.originalname.replace(/\s+/g,'_').replace(/[^\w.\-]/g,'');
    cb(null, `${Date.now()}__${base}.${ext}`);
  }
});
const upload = multer({ storage });

/* ====== Helpers ====== */
const cleanCPF = s => (s||'').replace(/\D/g,'');

/* ====== PÁGINAS ====== */

// Dashboard — qualquer usuário autenticado
router.get('/dashboard', ensureAuth, async (req, res) => {
  // tenta pegar dados reais da API (agendamentos recentes)
  let pendings = [];
  try {
    const data = await listAppointments(req);
    // normalize mínimos
    pendings = (data || []).map(a => ({
      user: a.userName || a.user || '—',
      service: a.service || a.servico || '—',
      date: a.date || a.data || '—',
      time: a.time || a.hora || '—',
    })).slice(0, 10);
  } catch (_) {
    pendings = mockAppointments;
  }

  // usuários recentes (se a API estiver ok)
  let recentUsers = [];
  try {
    const data = await listUsers(req);
    recentUsers = (data || []).slice(0, 6);
  } catch (_) {
    recentUsers = mockUsers.slice(0, 6);
  }

  res.render('admin/dashboard', {
    active: 'dashboard',
    stats,
    pendings,
    recentUsers,
    recentAppts: pendings.map(p => ({ user: p.user, serv: p.service, quando: `${p.date} ${p.time}` }))
  });
});

// Usuários — visível para ADMIN e ATENDENTE
router.get('/usuarios', ensureAuth, ensureRole('ADMIN','ATENDENTE'), async (req, res) => {
  const q = (req.query.q || '').trim();
  let users = [];
  try {
    users = await listUsers(req, q);
  } catch (_) {
    users = mockUsers.filter(u => !q || (u.name + u.email + u.cpf).toLowerCase().includes(q.toLowerCase()));
  }
  res.render('admin/usuarios', { active: 'users', users, q });
});

// Formulário Novo Usuário — ADMIN e ATENDENTE
router.get('/usuarios/novo', ensureAuth, ensureRole('ADMIN','ATENDENTE'), (req, res) => {
  res.render('admin/usuario_novo', { active: 'users', error: null });
});

// Criação de Usuário — ADMIN e ATENDENTE
router.post('/usuarios', ensureAuth, ensureRole('ADMIN','ATENDENTE'), async (req, res) => {
  const { name, email, cpf, password, role } = req.body;
  try {
    const payload = { name, email, cpf, password, role };
    await createUser(req, payload);
    return res.redirect('/admin/usuarios');
  } catch (err) {
    const msg = err?.response?.data?.error || 'Não foi possível criar o usuário.';
    return res.status(400).render('admin/usuario_novo', { active: 'users', error: msg });
  }
});

// Agendamentos — ADMIN e ATENDENTE veem todos; MÉDICO vê sua agenda
router.get('/agendamentos', ensureAuth, ensureRole('ADMIN','ATENDENTE','MEDICO'), async (req, res) => {
  let pendings = [];
  try {
    const data = await listAppointments(req);
    pendings = (data || []).map(a => ({
      user: a.userName || a.user || '—',
      service: a.service || a.servico || '—',
      date: a.date || a.data || '—',
      time: a.time || a.hora || '—',
      doctorId: a.doctorId || a.medicoId || null
    }));

    // filtra se for médico: apenas seus atendimentos
    if (req.session.user.role === 'MEDICO') {
      const myId = req.session.user.id;
      pendings = pendings.filter(p => !p.doctorId || String(p.doctorId) === String(myId));
    }
  } catch (_) {
    pendings = mockAppointments;
  }

  res.render('admin/agendamentos', { active: 'appointments', pendings });
});

// Relatórios — ADMIN e MEDICO
router.get('/relatorios', ensureAuth, ensureRole('ADMIN','MEDICO'), async (req, res) => {
  let users = [];
  try {
    users = await listUsers(req);
  } catch (_) {
    users = mockUsers;
  }
  res.render('admin/relatorios', { active: 'reports', users });
});

// Exames — ADMIN, MEDICO e ATENDENTE (todos podem usar a área de prontuários)
router.get('/exames', ensureAuth, ensureRole('ADMIN','MEDICO','ATENDENTE'), (req, res) => {
  res.render('admin/exames', { active: 'exams' });
});

/* ====== APIs POR CPF (uploads/avaliacoes locais) ====== */

// buscar paciente por CPF
router.get('/api/paciente/:cpf', ensureAuth, ensureRole('ADMIN','MEDICO','ATENDENTE'), async (req, res) => {
  const cpf = cleanCPF(req.params.cpf);
  // tenta pela API central
  try {
    const all = await listUsers(req);
    const p = (all || []).find(u => cleanCPF(u.cpf) === cpf);
    if (!p) return res.status(404).json({ error:'Paciente não encontrado.' });
    return res.json(p);
  } catch (_) {
    // fallback nos mocks
    const p = mockUsers.find(u => cleanCPF(u.cpf) === cpf);
    if (!p) return res.status(404).json({ error:'Paciente não encontrado.' });
    return res.json(p);
  }
});

// listar arquivos do CPF
router.get('/api/exames/:cpf', ensureAuth, ensureRole('ADMIN','MEDICO','ATENDENTE'), (req, res) => {
  const cpf = cleanCPF(req.params.cpf);
  const dir = path.join(UPLOADS_ROOT, cpf);
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir).map(f => ({ name:f, url:`/uploads/${cpf}/${f}` }));
  res.json(files);
});

// upload de arquivo para CPF
router.post('/api/exames/:cpf', ensureAuth, ensureRole('ADMIN','MEDICO','ATENDENTE'), upload.single('file'), (req, res) => {
  const cpf = cleanCPF(req.params.cpf);
  if (!req.file) return res.status(400).json({ error:'Arquivo não enviado' });
  return res.json({ ok:true, file:{ name:req.file.filename, url:`/uploads/${cpf}/${req.file.filename}` } });
});

// avaliações do CPF (em memória local)
const evaluations = {};
router.get('/api/avaliacoes/:cpf', ensureAuth, ensureRole('ADMIN','MEDICO','ATENDENTE'), (req, res) => {
  const cpf = cleanCPF(req.params.cpf);
  res.json(evaluations[cpf] || []);
});

router.post('/api/avaliacoes/:cpf', ensureAuth, ensureRole('ADMIN','MEDICO','ATENDENTE'), express.json(), (req, res) => {
  const cpf = cleanCPF(req.params.cpf);
  const { score, notes } = req.body || {};
  if (!(score >=1 && score <=5)) return res.status(400).json({ error:'score 1..5' });
  const item = { date: new Date().toISOString().slice(0,10), score, notes: notes || '' };
  evaluations[cpf] = evaluations[cpf] || [];
  evaluations[cpf].push(item);
  res.json(item);
});

module.exports = router;
