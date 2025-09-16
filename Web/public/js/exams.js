(() => {
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
  const fmtCPF = v => v.replace(/\D/g,'').slice(0,11)
    .replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');

  const cpfInput = $('#cpfInput');
  const buscarBtn = $('#btnBuscarCPF');
  const titulo = $('#pacienteTitulo');
  const area = $('#areaPaciente');
  const info = $('#pacienteInfo');
  const fileInput = $('#fileInput');
  const uploadBtn = $('#btnUploadFile');
  const fileList = $('#fileList');
  const evalScore = $('#evalScore');
  const evalNotes = $('#evalNotes');
  const evalSave = $('#evalSave');
  const evalList = $('#evalList');

  let current = null; // { cpf, name, email, birth, role }

  cpfInput && cpfInput.addEventListener('input', () => {
    const p = cpfInput.selectionStart;
    cpfInput.value = fmtCPF(cpfInput.value);
    cpfInput.selectionStart = cpfInput.selectionEnd = p;
  });

  async function loadPaciente(cpf){
    const res = await fetch(`/admin/api/paciente/${cpf}`);
    if(!res.ok) throw new Error('Paciente não encontrado');
    return res.json();
  }
  async function loadFiles(cpf){
    const r = await fetch(`/admin/api/exames/${cpf}`);
    return r.json();
  }
  async function loadEvals(cpf){
    const r = await fetch(`/admin/api/avaliacoes/${cpf}`);
    return r.json();
  }

  function renderInfo(p){
    info.innerHTML = `
      <div><strong>Nome:</strong> ${p.name}</div>
      <div><strong>CPF:</strong> ${fmtCPF(p.cpf)}</div>
      <div><strong>E-mail:</strong> ${p.email}</div>
      <div><strong>Nascimento:</strong> ${p.birth || '-'}</div>
      <div><strong>Papel:</strong> ${p.role}</div>`;
  }
  function renderFiles(arr){
    fileList.innerHTML = arr.map(f => `<li><a href="${f.url}" target="_blank">${f.name}</a></li>`).join('')
      || '<li>Nenhum arquivo.</li>';
  }
  function renderEvals(arr){
    evalList.innerHTML = arr.map(ev => `
      <li class="card">
        <div><strong>${'★'.repeat(ev.score)}${'☆'.repeat(5-ev.score)}</strong> — ${ev.date}</div>
        ${ev.notes ? `<div>${ev.notes}</div>` : ''}
      </li>
    `).join('') || '<li>Nenhuma avaliação.</li>';
  }

  async function buscarCPF(){
    const raw = cpfInput.value.replace(/\D/g,'');
    if(raw.length !== 11){ alert('Informe CPF válido (11 dígitos).'); return; }
    try{
      const p = await loadPaciente(raw);
      current = p;
      titulo.textContent = `Paciente: ${p.name}`;
      area.classList.remove('hidden');
      renderInfo(p);
      renderFiles(await loadFiles(p.cpf));
      renderEvals(await loadEvals(p.cpf));
    }catch(e){
      alert(e.message);
    }
  }

  buscarBtn && buscarBtn.addEventListener('click', buscarCPF);

  uploadBtn && uploadBtn.addEventListener('click', async ()=>{
    if(!current) return alert('Selecione um paciente.');
    if(!fileInput.files || !fileInput.files.length) return alert('Escolha um arquivo.');
    const fd = new FormData();
    fd.append('file', fileInput.files[0]);
    const r = await fetch(`/admin/api/exames/${current.cpf}`, { method:'POST', body: fd });
    if(!r.ok){ alert('Falha no upload.'); return; }
    fileInput.value = '';
    renderFiles(await loadFiles(current.cpf));
  });

  evalSave && evalSave.addEventListener('click', async ()=>{
    if(!current) return alert('Selecione um paciente.');
    const score = parseInt(evalScore.value,10);
    const notes = evalNotes.value;
    const r = await fetch(`/admin/api/avaliacoes/${current.cpf}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ score, notes })
    });
    if(!r.ok){ alert('Erro ao salvar.'); return; }
    evalNotes.value = '';
    renderEvals(await loadEvals(current.cpf));
  });

  // atalhos da sidebar
  $('#btnAddExam')?.addEventListener('click', ()=> fileInput?.focus());
  $('#btnAddEval')?.addEventListener('click', ()=> evalNotes?.focus());
})();
