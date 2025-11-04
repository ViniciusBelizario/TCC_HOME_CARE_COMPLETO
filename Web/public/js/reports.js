/* ============================================================
   RELATÓRIOS — FRONT MOCK
   - Usa window.__USERS__ (injetado pelo EJS)
   - Gera 3 painéis: Usuários, Agendamentos (com LOGS), Atendimentos
   - Permite filtrar por período e exportar CSV
   - Bloco lateral: busca/seleção de paciente + avaliações + arquivos
   ============================================================ */

/* -----------------------------
   MOCKS (podem ser trocados por API depois)
------------------------------*/
var USERS = window.__USERS__ || [
  { id: 1, name: 'Admin Master', role: 'ADMIN', email: 'admin@exemplo.com' },
  { id: 2, name: 'Dra. Juliana Costa', role: 'MEDICO', email: 'juliana@exemplo.com' },
  { id: 3, name: 'Jorge Cardoso', role: 'ATENDENTE', email: 'jorge@exemplo.com' },
  { id: 4, name: 'Maria Pereira', role: 'USUARIO', email: 'maria@exemplo.com' },
  { id: 5, name: 'Lucas Moraes', role: 'USUARIO', email: 'lucas@exemplo.com' }
];

function uById(id){ return USERS.find(function(u){return u.id===id;}) || {name:'—'}; }

// Agendamentos (com logs de liberação/aceite/cancelamento)
var APPTS = [
  {
    id: 101, patientId: 4, service: 'Avaliação', date: '2024-04-27', time: '10:00',
    releasedBy: 3, releasedAt: '2024-04-25T09:10:00',
    status: 'accepted',
    acceptedBy: 2, acceptedAt: '2024-04-26T15:22:00',
    logs: [
      { at: '2024-04-25T09:10:00', by: 3, action: 'release', note: 'Horário liberado pela secretaria' },
      { at: '2024-04-26T15:22:00', by: 2, action: 'accept', note: 'Aceito pela médica' }
    ]
  },
  {
    id: 102, patientId: 5, service: 'Fisioterapia', date: '2024-04-27', time: '15:20',
    releasedBy: 3, releasedAt: '2024-04-25T09:12:00',
    status: 'cancelled',
    cancelledBy: 3, cancelledAt: '2024-04-26T18:00:00',
    logs: [
      { at: '2024-04-25T09:12:00', by: 3, action: 'release', note: 'Janela extra' },
      { at: '2024-04-26T18:00:00', by: 3, action: 'cancel', note: 'Paciente pediu reagendamento' }
    ]
  },
  {
    id: 103, patientId: 5, service: 'Consulta Clínica', date: '2024-05-02', time: '09:00',
    releasedBy: 3, releasedAt: '2024-04-30T08:31:00',
    status: 'pending',
    logs: [
      { at: '2024-04-30T08:31:00', by: 3, action: 'release', note: 'Agenda mês vigente' }
    ]
  }
];

// Atendimentos (realizados)
var CARES = [
  {
    id: 201, patientId: 4, professionalId: 2, type: 'Consulta',
    startedAt: '2024-04-27T10:05:00', finishedAt: '2024-04-27T10:35:00',
    outcome: 'Alta com orientações', notes: 'Paciente apresentou melhora.'
  },
  {
    id: 202, patientId: 5, professionalId: 2, type: 'Consulta',
    startedAt: '2024-05-02T09:05:00', finishedAt: '2024-05-02T09:32:00',
    outcome: 'Solicitado hemograma', notes: 'Retorno em 15 dias.'
  }
];

/* -----------------------------
   ELEMENTOS
------------------------------*/
var elPatients = document.getElementById('patientList');
var elQuery    = document.getElementById('patientQuery');
var elTitle    = document.getElementById('patientTitle');
var elDetails  = document.getElementById('patientDetails');
var elEvalList = document.getElementById('evalList');
var elEvalScore= document.getElementById('evalScore');
var elEvalNotes= document.getElementById('evalNotes');
var elEvalSave = document.getElementById('evalSave');
var elFileInput= document.getElementById('fileInput');
var elBtnUpload= document.getElementById('btnUpload');
var elFileList = document.getElementById('fileList');
var elPanelOut = document.getElementById('panelOutput');

var selectedPatient = null;
var evalsByPatient  = {}; // {patientId: [{score,notes,at}]}
var filesByPatient  = {}; // {patientId: [{name,size,at}]}

/* -----------------------------
   HELPERS
------------------------------*/
function fmtDate(d){ return new Date(d).toLocaleString('pt-BR'); }
function pad2(n){ return (n<10?'0':'')+n; }
function toCSV(rows){
  if(!rows || !rows.length) return '';
  var cols = Object.keys(rows[0]);
  var out = [cols.join(';')];
  rows.forEach(function(r){
    out.push(cols.map(function(c){
      var v = (r[c]===undefined || r[c]===null) ? '' : String(r[c]);
      return '"' + v.replace(/"/g,'""') + '"';
    }).join(';'));
  });
  return out.join('\n');
}
function download(name, content){
  var blob = new Blob([content], {type:'text/csv;charset=utf-8;'});
  var url  = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 0);
}

/* -----------------------------
   PACIENTES (busca e seleção)
------------------------------*/
function renderPatientList(q){
  elPatients.innerHTML = '';
  var qnorm = (q||'').toLowerCase();
  USERS.filter(function(u){ return u.role==='USUARIO'; })
       .filter(function(u){
          return !qnorm || (u.name||'').toLowerCase().includes(qnorm) ||
                 (u.email||'').toLowerCase().includes(qnorm);
       })
       .forEach(function(u){
         var li = document.createElement('li');
         li.innerHTML =
           '<div><strong>'+u.name+'</strong></div>' +
           '<div class="meta">'+(u.email||'—')+'</div>' +
           '<button class="btn btn-small btn-outline" data-sel="'+u.id+'">Selecionar</button>';
         elPatients.appendChild(li);
       });
}
elQuery.addEventListener('input', function(){ renderPatientList(this.value); });
elPatients.addEventListener('click', function(ev){
  if(ev.target && ev.target.dataset.sel){
    var pid = Number(ev.target.dataset.sel);
    selectedPatient = uById(pid);
    elTitle.textContent = selectedPatient.name + ' — ' + (selectedPatient.email||'');
    elDetails.classList.remove('hidden');
    renderEvals();
    renderFiles();
  }
});

/* -----------------------------
   AVALIAÇÕES (mock em memória)
------------------------------*/
function renderEvals(){
  elEvalList.innerHTML = '';
  var arr = evalsByPatient[selectedPatient.id] || [];
  if(arr.length===0){
    elEvalList.innerHTML = '<div class="muted">Sem avaliações.</div>';
    return;
  }
  arr.slice().reverse().forEach(function(e){
    var div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = '<span class="badge '+ (e.score>=4?'ok':(e.score==3?'warn':'err')) +'">Nota '+e.score+'</span> '+
                    (e.notes||'')+' <span class="muted">— '+fmtDate(e.at)+'</span>';
    elEvalList.appendChild(div);
  });
}
elEvalSave.addEventListener('click', function(){
  if(!selectedPatient) return alert('Selecione um paciente.');
  var item = { score: Number(elEvalScore.value), notes: elEvalNotes.value.trim(), at: new Date().toISOString() };
  evalsByPatient[selectedPatient.id] = (evalsByPatient[selectedPatient.id]||[]);
  evalsByPatient[selectedPatient.id].push(item);
  elEvalNotes.value = '';
  renderEvals();
});

/* -----------------------------
   ARQUIVOS (mock em memória)
------------------------------*/
function renderFiles(){
  elFileList.innerHTML = '';
  var arr = filesByPatient[selectedPatient.id] || [];
  if(arr.length===0){
    elFileList.innerHTML = '<li class="muted">Nenhum arquivo enviado.</li>';
    return;
  }
  arr.slice().reverse().forEach(function(f){
    var li = document.createElement('li');
    li.textContent = f.name + ' — ' + Math.round(f.size/1024) + ' KB — ' + fmtDate(f.at);
    elFileList.appendChild(li);
  });
}
elBtnUpload.addEventListener('click', function(){
  if(!selectedPatient) return alert('Selecione um paciente.');
  var f = elFileInput.files && elFileInput.files[0];
  if(!f){ alert('Escolha um arquivo.'); return; }
  filesByPatient[selectedPatient.id] = (filesByPatient[selectedPatient.id]||[]);
  filesByPatient[selectedPatient.id].push({ name: f.name, size: f.size, at: new Date().toISOString() });
  elFileInput.value = '';
  renderFiles();
});

/* -----------------------------
   PAINÉIS DE RELATÓRIOS
------------------------------*/
function renderReportUsers(){
  var out = document.createElement('div');

  // filtros simples
  var kpi = document.createElement('div'); kpi.className='kpi';
  kpi.innerHTML =
    '<span class="pill">Total: '+USERS.length+'</span>'+
    '<span class="pill">Admins: '+USERS.filter(function(u){return u.role==='ADMIN';}).length+'</span>'+
    '<span class="pill">Médicos: '+USERS.filter(function(u){return u.role==='MEDICO';}).length+'</span>'+
    '<span class="pill">Atendentes: '+USERS.filter(function(u){return u.role==='ATENDENTE';}).length+'</span>'+
    '<span class="pill">Pacientes: '+USERS.filter(function(u){return u.role==='USUARIO';}).length+'</span>';
  out.appendChild(kpi);

  var rows = USERS.map(function(u){
    return { ID:u.id, Nome:u.name, Email:(u.email||''), Papel:u.role };
  });

  var toolbar = document.createElement('div'); toolbar.className='row';
  var btnCsv = document.createElement('button'); btnCsv.className='btn btn-outline'; btnCsv.textContent='Exportar CSV';
  btnCsv.addEventListener('click', function(){ download('usuarios.csv', toCSV(rows)); });
  toolbar.appendChild(btnCsv); out.appendChild(toolbar);

  var tbl = document.createElement('table'); tbl.className='table';
  tbl.innerHTML = '<thead><tr><th>ID</th><th>Nome</th><th>Email</th><th>Papel</th></tr></thead><tbody></tbody>';
  rows.forEach(function(r){
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>'+r.ID+'</td><td>'+r.Nome+'</td><td>'+r.Email+'</td><td>'+r.Papel+'</td>';
    tbl.querySelector('tbody').appendChild(tr);
  });
  out.appendChild(tbl);

  elPanelOut.innerHTML = '';
  elPanelOut.appendChild(out);
}

function renderReportAppointments(){
  var out = document.createElement('div');

  // filtros
  var box = document.createElement('div'); box.className='row';
  var fDe = document.createElement('input'); fDe.type='date'; fDe.className='input';
  var fAte= document.createElement('input'); fAte.type='date'; fAte.className='input';
  var fStatus = document.createElement('select'); fStatus.className='input';
  ['','pending','accepted','cancelled'].forEach(function(s){
    var o=document.createElement('option'); o.value=s; o.textContent= s? s.toUpperCase() : 'Todos os status'; fStatus.appendChild(o);
  });
  var btn = document.createElement('button'); btn.className='btn btn-primary'; btn.textContent='Aplicar';
  box.appendChild(fDe); box.appendChild(fAte); box.appendChild(fStatus); box.appendChild(btn);
  out.appendChild(box);

  var tbl = document.createElement('table'); tbl.className='table';
  tbl.innerHTML = '<thead><tr>'+
    '<th>ID</th><th>Paciente</th><th>Serviço</th><th>Data</th><th>Hora</th>'+
    '<th>Status</th><th>Liberado por</th><th>Aceito por</th><th>Logs</th>'+
    '</tr></thead><tbody></tbody>';

  function apply(){
    var rows = APPTS.filter(function(a){
      var ok = true;
      if(fDe.value){ ok = ok && (a.date >= fDe.value); }
      if(fAte.value){ ok = ok && (a.date <= fAte.value); }
      if(fStatus.value){ ok = ok && (a.status === fStatus.value); }
      return ok;
    });

    var csvRows = [];

    var tbody = tbl.querySelector('tbody'); tbody.innerHTML='';
    rows.forEach(function(a){
      var pac = uById(a.patientId).name;
      var rel = uById(a.releasedBy).name + ' ('+fmtDate(a.releasedAt)+')';
      var acc = a.acceptedBy ? (uById(a.acceptedBy).name + ' ('+fmtDate(a.acceptedAt)+')') : '—';

      // logs
      var logsHtml = '';
      a.logs.forEach(function(l){
        var who = uById(l.by).name;
        var t = l.action==='release'?'info':(l.action==='accept'?'ok':(l.action==='cancel'?'err':'warn'));
        var label = l.action==='release'?'Liberação':(l.action==='accept'?'Aceite':(l.action==='cancel'?'Cancelamento':l.action));
        logsHtml += '<div class="badge '+t+'" title="'+(l.note||'')+'">'+label+' • '+who+' • '+fmtDate(l.at)+'</div> ';
      });

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>'+a.id+'</td><td>'+pac+'</td><td>'+a.service+'</td><td>'+a.date+'</td><td>'+a.time+'</td>'+
        '<td>'+a.status.toUpperCase()+'</td><td>'+rel+'</td><td>'+acc+'</td><td>'+logsHtml+'</td>';
      tbody.appendChild(tr);

      csvRows.push({
        id:a.id, paciente:pac, servico:a.service, data:a.date, hora:a.time,
        status:a.status, liberado_por:uById(a.releasedBy).name, liberado_em:fmtDate(a.releasedAt),
        aceito_por: a.acceptedBy ? uById(a.acceptedBy).name : '',
        aceito_em:  a.acceptedAt ? fmtDate(a.acceptedAt) : '',
        logs: a.logs.map(function(l){ return l.action+'|'+uById(l.by).name+'|'+fmtDate(l.at); }).join(' ; ')
      });
    });

    // barra de ações
    act.innerHTML = '';
    var btnCsv = document.createElement('button'); btnCsv.className='btn btn-outline'; btnCsv.textContent='Exportar CSV';
    btnCsv.addEventListener('click', function(){ download('agendamentos.csv', toCSV(csvRows)); });
    act.appendChild(btnCsv);
  }

  var act = document.createElement('div'); act.className='row'; out.appendChild(act);

  btn.addEventListener('click', apply);
  apply();

  out.appendChild(tbl);
  elPanelOut.innerHTML=''; elPanelOut.appendChild(out);
}

function renderReportCare(){
  var out = document.createElement('div');

  // filtros
  var box = document.createElement('div'); box.className='row';
  var fDe = document.createElement('input'); fDe.type='date'; fDe.className='input';
  var fAte= document.createElement('input'); fAte.type='date'; fAte.className='input';
  var fPro = document.createElement('select'); fPro.className='input';
  var opt0 = document.createElement('option'); opt0.value=''; opt0.textContent='Todos os profissionais'; fPro.appendChild(opt0);
  USERS.filter(function(u){return u.role==='MEDICO';}).forEach(function(m){
    var o=document.createElement('option'); o.value=m.id; o.textContent=m.name; fPro.appendChild(o);
  });
  var btn = document.createElement('button'); btn.className='btn btn-primary'; btn.textContent='Aplicar';
  box.appendChild(fDe); box.appendChild(fAte); box.appendChild(fPro); box.appendChild(btn);
  out.appendChild(box);

  var tbl = document.createElement('table'); tbl.className='table';
  tbl.innerHTML = '<thead><tr>'+
    '<th>ID</th><th>Paciente</th><th>Profissional</th><th>Tipo</th>'+
    '<th>Início</th><th>Fim</th><th>Resultado</th><th>Obs.</th>'+
    '</tr></thead><tbody></tbody>';

  function apply(){
    var rows = CARES.filter(function(c){
      var ok = true;
      var d = (c.startedAt || '').slice(0,10);
      if(fDe.value){ ok = ok && (d >= fDe.value); }
      if(fAte.value){ ok = ok && (d <= fAte.value); }
      if(fPro.value){ ok = ok && (String(c.professionalId)===String(fPro.value)); }
      return ok;
    });

    var csvRows = [];

    var tbody = tbl.querySelector('tbody'); tbody.innerHTML='';
    rows.forEach(function(c){
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>'+c.id+'</td>'+
        '<td>'+uById(c.patientId).name+'</td>'+
        '<td>'+uById(c.professionalId).name+'</td>'+
        '<td>'+c.type+'</td>'+
        '<td>'+fmtDate(c.startedAt)+'</td>'+
        '<td>'+fmtDate(c.finishedAt)+'</td>'+
        '<td>'+c.outcome+'</td>'+
        '<td>'+(c.notes||'')+'</td>';
      tbody.appendChild(tr);

      csvRows.push({
        id:c.id,paciente:uById(c.patientId).name,profissional:uById(c.professionalId).name,tipo:c.type,
        inicio:fmtDate(c.startedAt), fim:fmtDate(c.finishedAt), resultado:c.outcome, obs:(c.notes||'')
      });
    });

    act.innerHTML='';
    var btnCsv = document.createElement('button'); btnCsv.className='btn btn-outline'; btnCsv.textContent='Exportar CSV';
    btnCsv.addEventListener('click', function(){ download('atendimentos.csv', toCSV(csvRows)); });
    act.appendChild(btnCsv);
  }

  var act = document.createElement('div'); act.className='row'; out.appendChild(act);

  btn.addEventListener('click', apply);
  apply();

  out.appendChild(tbl);
  elPanelOut.innerHTML=''; elPanelOut.appendChild(out);
}

/* -----------------------------
   TABS Paciente
------------------------------*/
(function(){
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function(tb){
    tb.addEventListener('click', function(){
      tabs.forEach(function(t){t.classList.remove('active');});
      tb.classList.add('active');
      var name = tb.getAttribute('data-tab');
      document.querySelectorAll('.tab-pane').forEach(function(p){ p.classList.remove('is-visible'); });
      document.getElementById('tab-'+name).classList.add('is-visible');
    });
  });
})();

/* -----------------------------
   Botões da grade lateral
------------------------------*/
(function(){
  document.querySelectorAll('.report-item').forEach(function(btn){
    btn.addEventListener('click', function(){
      var panel = btn.getAttribute('data-panel');
      if(panel==='users') return renderReportUsers();
      if(panel==='appointments') return renderReportAppointments();
      if(panel==='care') return renderReportCare();
    });
  });
})();

/* -----------------------------
   Init
------------------------------*/
renderPatientList('');
elPanelOut.innerHTML = '<div class="muted">Escolha um relatório na coluna da esquerda.</div>';
