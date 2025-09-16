(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const debounce = (fn, wait = 250) => { let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a),wait);} };

  const users = Array.isArray(window.__USERS__) ? window.__USERS__ : [];
  const patientList = $('#patientList');
  const patientQuery = $('#patientQuery');
  const patientTitle = $('#patientTitle');
  const patientDetails = $('#patientDetails');

  let currentPatient = null;

  /* ======== BUSCA DE PACIENTE ======== */
  const renderPatients = (rows) => {
    patientList.innerHTML = rows.map(p =>
      `<li><button class="patient-item" data-id="${p.id}" data-name="${p.name}">${p.name} <small>(${p.email})</small></button></li>`
    ).join('') || '<li>Nenhum paciente.</li>';
  };

  const fetchPatients = debounce(async () => {
    const q = (patientQuery.value || '').trim();
    const url = q ? `/admin/api/pacientes?q=${encodeURIComponent(q)}` : `/admin/api/pacientes`;
    const res = await fetch(url);
    const data = await res.json();
    renderPatients(data);
  }, 200);

  patientQuery && patientQuery.addEventListener('input', fetchPatients);
  renderPatients(users);

  /* ======== AÇÕES AO SELECIONAR PACIENTE ======== */
  patientList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.patient-item');
    if (!btn) return;
    currentPatient = { id: btn.dataset.id, name: btn.dataset.name };
    patientTitle.textContent = `Paciente: ${currentPatient.name}`;
    patientDetails.classList.remove('hidden');
    // carrega abas iniciais
    await loadEvaluations();
    await loadFiles();
  });

  /* ======== ABAS ======== */
  $$('.tab').forEach(b=>{
    b.addEventListener('click', ()=>{
      $$('.tab').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const tab = b.dataset.tab;
      $$('.tab-pane').forEach(p=>p.classList.remove('is-visible'));
      $(`#tab-${tab}`).classList.add('is-visible');
    });
  });

  /* ======== AVALIAÇÕES ======== */
  const renderEval = (arr=[]) => {
    const box = $('#evalList');
    box.innerHTML = arr.map(ev => `
      <div class="card">
        <div><strong>${'★'.repeat(ev.score)}${'☆'.repeat(5-ev.score)}</strong> — ${ev.date}</div>
        ${ev.notes ? `<div>${ev.notes}</div>` : ''}
      </div>
    `).join('') || '<div>Nenhuma avaliação cadastrada.</div>';
  };

  async function loadEvaluations(){
    if(!currentPatient) return;
    const res = await fetch(`/admin/api/pacientes/${currentPatient.id}/evaluations`);
    renderEval(await res.json());
  }

  $('#evalSave').addEventListener('click', async () => {
    if(!currentPatient) return alert('Selecione um paciente.');
    const score = parseInt($('#evalScore').value,10);
    const notes = $('#evalNotes').value;
    const res = await fetch(`/admin/api/pacientes/${currentPatient.id}/evaluations`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ score, notes })
    });
    if(!res.ok){ alert('Erro ao salvar.'); return; }
    $('#evalNotes').value = '';
    await loadEvaluations();
  });

  /* ======== ARQUIVOS ======== */
  const renderFiles = (arr=[]) => {
    $('#fileList').innerHTML = arr.map(f => `
      <li>
        <a href="${f.url}" target="_blank">${f.name}</a>
      </li>
    `).join('') || '<li>Nenhum arquivo enviado.</li>';
  };

  async function loadFiles(){
    if(!currentPatient) return;
    const res = await fetch(`/admin/api/pacientes/${currentPatient.id}/files`);
    renderFiles(await res.json());
  }

  $('#btnUpload').addEventListener('click', async () => {
    if(!currentPatient) return alert('Selecione um paciente.');
    const input = $('#fileInput');
    if(!input.files || !input.files.length) return alert('Escolha um arquivo.');
    const fd = new FormData();
    fd.append('file', input.files[0]);
    const res = await fetch(`/admin/api/pacientes/${currentPatient.id}/upload`, { method:'POST', body: fd });
    if(!res.ok){ alert('Falha no upload.'); return; }
    input.value = '';
    await loadFiles();
  });

  /* ======== RELATÓRIOS (cards da esquerda) ======== */
  $$('.report-item').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      const which = btn.dataset.panel;
      $('#panelOutput').innerHTML = `
        <div class="card">
          <h4>Prévia — ${which}</h4>
          <p>Selecione um paciente ao lado para detalhar.</p>
        </div>`;
    });
  });
})();
