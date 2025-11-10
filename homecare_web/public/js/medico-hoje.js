// src/public/js/medico-hoje.js
(function () {
  const $refresh = document.getElementById('mh-refresh');

  // Abas
  const $tabOpen = document.getElementById('mh-tab-open');
  const $tabCompleted = document.getElementById('mh-tab-completed');
  const $panelOpen = document.getElementById('mh-panel-open');
  const $panelCompleted = document.getElementById('mh-panel-completed');

  const $tbodyOpen = document.querySelector('#mh-table-open tbody');
  const $tbodyCompleted = document.querySelector('#mh-table-completed tbody');

  const $modalRoot = document.querySelector('.modal-root');
  const $slot = $modalRoot.querySelector('.modal-slot');

  const state = { open: [], completed: [] };

  (function ensureModalOnBody() {
    if ($modalRoot && $modalRoot.parentElement !== document.body) {
      document.body.appendChild($modalRoot);
    }
  })();

  function toast({ title='Aviso', message='', variant='success', timeout=6000 }){
    let stack = document.getElementById('toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'toast-stack';
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast toast--${variant}`;
    el.innerHTML = `
      <div class="toast__bar"></div>
      <div class="toast__content">
        <strong class="toast__title">${title}</strong>
        <p class="toast__message">${message}</p>
      </div>
      <button class="toast__close" aria-label="Fechar">&times;</button>
    `;
    stack.appendChild(el);
    const close = () => { el.classList.add('toast--hide'); setTimeout(()=>el.remove(), 250); };
    el.querySelector('.toast__close')?.addEventListener('click', close);
    setTimeout(close, timeout);
  }

  // Tabs
  function activateTab(which) {
    const isOpen = which === 'open';
    $tabOpen.classList.toggle('is-active', isOpen);
    $tabCompleted.classList.toggle('is-active', !isOpen);
    $tabOpen.setAttribute('aria-selected', String(isOpen));
    $tabCompleted.setAttribute('aria-selected', String(!isOpen));

    $panelOpen.classList.toggle('is-active', isOpen);
    $panelOpen.hidden = !isOpen;
    $panelCompleted.classList.toggle('is-active', !isOpen);
    $panelCompleted.hidden = isOpen;
  }
  $tabOpen?.addEventListener('click', () => activateTab('open'));
  $tabCompleted?.addEventListener('click', () => activateTab('completed'));

  async function fetchHoje() {
    const r = await fetch(`/medico/pacientes-hoje/_list.json`, { headers: { 'Accept': 'application/json' }});
    const json = await r.json().catch(()=>null);
    if (!r.ok) throw new Error(json?.error || 'Falha ao carregar a agenda de hoje.');
    return {
      open: Array.isArray(json?.open) ? json.open : [],
      completed: Array.isArray(json?.completed) ? json.completed : [],
    };
  }

  function escapeHtml(s){ return String(s??'').replace(/[&<>"'`=\/]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c])); }

  function renderOpen(items) {
    if (!items.length) {
      $tbodyOpen.innerHTML = `<tr><td colspan="4">Nenhuma consulta CONFIRMED para hoje.</td></tr>`;
      return;
    }
    $tbodyOpen.innerHTML = items.map(a => `
      <tr data-kind="open" data-status="${a.status}" data-patient-id="${a.patientId}" data-appointment-id="${a.appointmentId}">
        <td>${a.timeDisplay || '—'}</td>
        <td>${escapeHtml(a.patientName || '—')}</td>
        <td>${escapeHtml(a.patientPhone || '-')}</td>
        <td class="mh-col-actions">
          <button class="btn btn-ghost btn-detail">Detalhes</button>
          <button class="btn btn-success btn-finish">Finalizar consulta</button>
        </td>
      </tr>
    `).join('');
  }

  function renderCompleted(items) {
    if (!items.length) {
      $tbodyCompleted.innerHTML = `<tr><td colspan="5">Nenhuma consulta finalizada hoje.</td></tr>`;
      return;
    }
    $tbodyCompleted.innerHTML = items.map(a => `
      <tr data-kind="completed" data-status="${a.status}" data-patient-id="${a.patientId}" data-appointment-id="${a.appointmentId}">
        <td>${a.timeDisplay || '—'}</td>
        <td>${escapeHtml(a.patientName || '—')}</td>
        <td>${escapeHtml(a.patientPhone || '-')}</td>
        <td><span class="mh-badge mh-badge--success">Finalizada</span></td>
        <td class="mh-col-actions">
          <button class="btn btn-ghost btn-detail">Detalhes</button>
        </td>
      </tr>
    `).join('');
  }

  async function load() {
    $tbodyOpen.innerHTML = `<tr><td colspan="4">Carregando...</td></tr>`;
    $tbodyCompleted.innerHTML = `<tr><td colspan="5">Carregando...</td></tr>`;
    try {
      const { open, completed } = await fetchHoje();
      state.open = open;
      state.completed = completed;
      renderOpen(state.open);
      renderCompleted(state.completed);
    } catch (err) {
      const msg = escapeHtml(err?.message || 'Erro ao carregar.');
      $tbodyOpen.innerHTML = `<tr><td colspan="4" style="color:#b71c1c">${msg}</td></tr>`;
      $tbodyCompleted.innerHTML = `<tr><td colspan="5" style="color:#b71c1c">${msg}</td></tr>`;
    }
  }

  // Modal helpers
  function closeModal(){ $modalRoot.classList.remove('is-open'); $slot.innerHTML = ''; }
  $modalRoot.addEventListener('click',(e)=>{ if (e.target.classList.contains('modal-backdrop')) closeModal(); if (e.target.closest('[data-close]')) { e.preventDefault(); closeModal(); } });

  async function openDetails(row) {
    const apptId = row.dataset.appointmentId;
    const patientId = row.dataset.patientId;

    const item = state.open.find(i => String(i.appointmentId) === apptId) ||
                 state.completed.find(i => String(i.appointmentId) === apptId);

    // exames
    let exams = [];
    try {
      const r = await fetch(`/medico/pacientes/${patientId}/exams`, { headers: { 'Accept': 'application/json' }});
      const json = await r.json().catch(()=>null);
      if (r.ok) exams = Array.isArray(json?.items) ? json.items : [];
    } catch {}

    const list = exams.length
      ? `<ul class="mh-exams">
          ${exams.map(e => `
            <li>
              <a href="${e.filePath}" target="_blank" rel="noopener">${escapeHtml(e.filename || 'arquivo')}</a>
              <small class="mh-exam-meta">${new Date(e.createdAt).toLocaleString('pt-BR')}</small>
              ${e.description ? `<div class="mh-exam-desc">${escapeHtml(e.description)}</div>` : ''}
            </li>`).join('')}
        </ul>`
      : `<p>Nenhum exame disponível.</p>`;

    // Novo: bloco de observação do médico (quando existir)
    let obsHtml = '<span>—</span>';
    if (item?.patientObservation && item.patientObservation.note) {
      const when = item.patientObservation.createdAt
        ? new Date(item.patientObservation.createdAt).toLocaleString('pt-BR')
        : '';
      const who = item.patientObservation.doctorName || '';
      obsHtml = `
        <div class="mh-obs">
          <div class="mh-obs-note">${escapeHtml(item.patientObservation.note)}</div>
          <small class="mh-obs-meta">${escapeHtml(who)} ${when ? '• ' + when : ''}</small>
        </div>
      `;
    }

    const canFinish = (row.dataset.kind === 'open') && (String(item?.status).toUpperCase() === 'CONFIRMED');

    const html = `
      <div class="modal">
        <div class="modal__card">
          <h2 class="modal__title">Detalhes da consulta</h2>

          <div class="detail-list">
            <div class="row"><div class="label">Horário</div><div class="value">${item?.timeDisplay || '—'}</div></div>
            <div class="row"><div class="label">Paciente</div><div class="value">${escapeHtml(item?.patientName || '—')}</div></div>
            <div class="row"><div class="label">Telefone</div><div class="value">${escapeHtml(item?.patientPhone || '-')}</div></div>
            <div class="row"><div class="label">Endereço</div><div class="value">${escapeHtml(item?.patientAddressFull || '-')}</div></div>
            <div class="row"><div class="label">Relato/Notas</div><div class="value">${escapeHtml(item?.notes || '-')}</div></div>
            <div class="row"><div class="label">Status</div><div class="value"><strong>${escapeHtml(item?.status || '-')}</strong></div></div>
            <div class="row"><div class="label">Observação do médico</div><div class="value" id="mh-obs-block">${obsHtml}</div></div>
          </div>

          <h3 style="margin-top:12px;">Exames enviados</h3>
          ${list}

          <h3 style="margin-top:12px;">Adicionar observação</h3>
          <form id="mh-note-form" class="form" novalidate>
            <div class="field">
              <label class="label">Observação</label>
              <textarea class="input mh-textarea" name="note" placeholder="Ex.: Paciente com melhora clínica. Retorno em 7 dias." rows="4" required></textarea>
            </div>
            <div class="form__error" id="mh-note-error" aria-live="polite"></div>
            <div class="modal__footer">
              <button class="btn btn-ghost" type="button" data-close>Fechar</button>
              ${canFinish ? `<button class="btn btn-success" type="button" id="mh-finish-btn" data-appt="${apptId}">Finalizar consulta</button>` : ''}
              <button class="btn btn-primary" type="submit" id="mh-note-save">Salvar observação</button>
            </div>
          </form>
        </div>
      </div>`;
    $slot.innerHTML = html;
    $modalRoot.classList.add('is-open');

    // salvar observação
    const $form = document.getElementById('mh-note-form');
    const $err = document.getElementById('mh-note-error');
    const $save = document.getElementById('mh-note-save');
    $form.addEventListener('submit', async (e) => {
      e.preventDefault();
      $err.textContent = '';
      const fd = new FormData($form);
      const note = String(fd.get('note') || '').trim();
      if (!note) { $err.textContent = 'Digite a observação.'; return; }
      try {
        $save.disabled = true; $save.textContent = 'Salvando...';
        const r = await fetch(`/medico/pacientes/${patientId}/observations`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note }),
        });
        const json = await r.json().catch(()=>null);
        if (!r.ok || json?.ok === false) throw new Error(json?.error || 'Falha ao salvar.');

        toast({ title: 'Observação salva', message: 'Registrada com sucesso.', variant: 'success' });

        // Após salvar, recarrega listas para que o item passe a ter patientObservation
        await load();

        // Atualiza visual no modal rapidamente com a nova nota
        const $obs = document.getElementById('mh-obs-block');
        if ($obs) {
          const when = new Date().toLocaleString('pt-BR');
          $obs.innerHTML = `
            <div class="mh-obs">
              <div class="mh-obs-note">${escapeHtml(note)}</div>
              <small class="mh-obs-meta">${when}</small>
            </div>
          `;
        }
        $form.reset();
      } catch (err) {
        $err.textContent = err?.message || 'Erro ao salvar observação.';
      } finally {
        $save.disabled = false; $save.textContent = 'Salvar observação';
      }
    });

    // finalizar (no modal)
    const $finish = document.getElementById('mh-finish-btn');
    $finish?.addEventListener('click', () => doFinish(apptId));
  }

  // finalizar (linha ou modal) — mantém as regras (só CONFIRMED)
  async function doFinish(apptId, btn) {
    const itm = state.open.find(i => String(i.appointmentId) === String(apptId));
    if (!itm || String(itm.status).toUpperCase() !== 'CONFIRMED') {
      toast({ title: 'Ação inválida', message: 'A consulta precisa estar CONFIRMED para finalizar.', variant: 'warning' });
      return;
    }

    try {
      if (btn) { btn.disabled = true; btn.textContent = 'Finalizando...'; }
      const r = await fetch(`/medico/consultas/${encodeURIComponent(apptId)}/finalizar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      });
      const json = await r.json().catch(()=>null);
      if (!r.ok || json?.ok === false) throw new Error(json?.message || 'Falha ao finalizar.');

      const idx = state.open.findIndex(i => String(i.appointmentId) === String(apptId));
      if (idx >= 0) {
        const it = { ...state.open[idx], status: 'COMPLETED' };
        state.open.splice(idx, 1);
        state.completed.unshift(it);
      }

      renderOpen(state.open);
      renderCompleted(state.completed);
      toast({ title: 'Consulta finalizada', message: 'Status atualizado para COMPLETED.', variant: 'success' });
      closeModal();
    } catch (err) {
      toast({ title: 'Erro', message: err?.message || 'Não foi possível finalizar a consulta.', variant: 'danger' });
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Finalizar consulta'; }
    }
  }

  // Delegação de cliques (linhas)
  document.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-appointment-id]');
    if (!row) return;

    if (e.target.closest('.btn-detail')) {
      openDetails(row);
    } else if (e.target.closest('.btn-finish')) {
      const apptId = row.dataset.appointmentId;
      const btn = e.target.closest('.btn-finish');
      doFinish(apptId, btn);
    }
  });

  $refresh?.addEventListener('click', load);

  setInterval(load, 20000); // auto-refresh

  // Inicial
  activateTab('open');
  load();
})();
