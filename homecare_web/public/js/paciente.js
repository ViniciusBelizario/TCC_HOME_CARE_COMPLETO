// public/js/paciente.js
(function () {
  const pacientesInicial = Array.isArray(window.PACIENTES) ? window.PACIENTES : [];
  const $tbody = document.getElementById('pacientesTbody');
  const $modalRoot = document.querySelector('.modal-root');
  const $slot = $modalRoot.querySelector('.modal-slot');

  (function ensureModalOnBody() {
    if ($modalRoot && $modalRoot.parentElement !== document.body) {
      document.body.appendChild($modalRoot);
    }
  })();

  const state = { byId: new Map(), list: [] };

  function renderRowCells(p) {
    const phone = p?.patientProfile?.phone || '-';
    return `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td class="cell-phone">${phone}</td>
      <td><button class="btn btn--sm btn-detail">Detalhe</button></td>
    `;
  }

  function createRow(p) {
    const tr = document.createElement('tr');
    tr.dataset.id = p.id;
    tr.innerHTML = renderRowCells(p);
    return tr;
  }

  function upsertRow(p) {
    let tr = $tbody.querySelector(`tr[data-id="${p.id}"]`);
    if (!tr) {
      tr = createRow(p);
      $tbody.prepend(tr);
    } else {
      tr.innerHTML = renderRowCells(p);
    }
  }

  function setStateAndRender(list) {
    state.byId.clear();
    state.list = list.slice().sort((a, b) => Number(b.id) - Number(a.id));
    for (const p of state.list) state.byId.set(String(p.id), p);
    $tbody.innerHTML = '';
    for (const p of state.list) $tbody.appendChild(createRow(p));
  }

  setStateAndRender(pacientesInicial);

  $modalRoot.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) fecharModal();
    if (e.target.closest('[data-close]')) { e.preventDefault(); fecharModal(); }
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-detail');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    abrirDetalhe(id);
  });

  const btnCadastrar = document.getElementById('btnCadastrar');
  btnCadastrar?.addEventListener('click', () => abrirCadastro());

  async function abrirDetalhe(id) {
    try {
      const r = await fetch(`/pacientes/${id}`);
      if (!r.ok) throw new Error('Falha ao buscar paciente');
      const p = await r.json();

      const nasc = p.patientProfile?.birthDate
        ? new Date(p.patientProfile.birthDate).toLocaleDateString('pt-BR')
        : '-';

      const exames = Array.isArray(p.patientExams) && p.patientExams.length
        ? `<ul>${p.patientExams.map(e =>
            `<li><a href="${e.filePath}" target="_blank" rel="noopener">${e.filename}</a></li>`
          ).join('')}</ul>`
        : '<p>Nenhum exame cadastrado.</p>';

      const html = `
        <div class="modal">
          <div class="modal__card">
            <h2 class="modal__title">Detalhes do paciente</h2>
            <div class="detail-list">
              <div class="row"><div class="label">Nome</div><div class="value">${p.name}</div></div>
              <div class="row"><div class="label">E-mail</div><div class="value">${p.email || '-'}</div></div>
              <div class="row"><div class="label">CPF</div><div class="value">${p.cpf || '-'}</div></div>
              <div class="row"><div class="label">Telefone</div><div class="value">${p.patientProfile?.phone || '-'}</div></div>
              <div class="row"><div class="label">Nascimento</div><div class="value">${nasc}</div></div>
              <div class="row"><div class="label">Endereço</div><div class="value">${p.patientProfile?.address || '-'}</div></div>
              <div class="row"><div class="label">Exames</div><div class="value">${exames}</div></div>
            </div>
            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" data-close>Voltar</button>
            </div>
          </div>
        </div>`;
      $slot.innerHTML = html;
      $modalRoot.classList.add('is-open');
    } catch (e) {
      console.error(e);
      alert('Não foi possível carregar detalhes do paciente.');
    }
  }

  function abrirCadastro() {
    const hoje = new Date().toISOString().slice(0, 10);
    const html = `
      <div class="modal">
        <div class="modal__card">
          <h2 class="modal__title">Cadastrar paciente</h2>

          <form id="formCadastro" class="form" novalidate>
            <div class="field">
              <label class="label">Nome</label>
              <input name="name" class="input" placeholder="Nome completo" required />
            </div>
            <div class="field">
              <label class="label">E-mail</label>
              <input name="email" type="email" class="input" placeholder="email@dominio.com" required />
            </div>
            <div class="field">
              <label class="label">CPF</label>
              <input name="cpf" class="input" placeholder="Somente números" minlength="11" maxlength="11" required />
            </div>
            <div class="field">
              <label class="label">Senha</label>
              <input name="password" type="password" class="input" placeholder="••••••••" minlength="6" required />
            </div>
            <div class="field">
              <label class="label">Telefone</label>
              <input name="phone" class="input" placeholder="11999999999" />
            </div>
            <div class="field">
              <label class="label">Endereço</label>
              <input name="address" class="input" placeholder="Rua, número, bairro" />
            </div>
            <div class="field">
              <label class="label">Nascimento</label>
              <input name="birthDate" type="date" class="input" max="${hoje}" />
            </div>

            <div class="form__error" id="formError" aria-live="polite"></div>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" data-close>Voltar</button>
              <button type="submit" class="btn btn--primary" id="btnSalvar">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    `;
    $slot.innerHTML = html;
    $modalRoot.classList.add('is-open');

    const $form = document.getElementById('formCadastro');
    const $error = document.getElementById('formError');
    const $btnSalvar = document.getElementById('btnSalvar');

    $form.addEventListener('submit', async (e) => {
      e.preventDefault();
      $error.textContent = '';

      const formData = new FormData($form);
      const payload = Object.fromEntries(formData.entries());

      // validações simples
      if (!payload.name || !payload.email || !payload.cpf || !payload.password) {
        $error.textContent = 'Preencha nome, e-mail, CPF e senha.';
        return;
      }
      payload.cpf = (payload.cpf || '').replace(/\D/g, '');
      if (payload.cpf.length !== 11) {
        $error.textContent = 'CPF deve ter 11 dígitos.';
        return;
      }
      payload.phone = (payload.phone || '').replace(/\D/g, '');
      if (payload.phone && (payload.phone.length < 10 || payload.phone.length > 11)) {
        $error.textContent = 'Telefone deve ter DDD + número (10 ou 11 dígitos).';
        return;
      }
      if (!payload.birthDate) payload.birthDate = null;

      try {
        $btnSalvar.disabled = true;
        $btnSalvar.textContent = 'Salvando...';

        const r = await fetch('/pacientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await r.json();

        if (!r.ok) {
          // Mostra a msg do backend já tratada no controller
          throw new Error(data?.error || 'Erro no cadastro');
        }

        const novo = {
          id: data?.id ?? '—',
          name: data?.name ?? payload.name,
          patientProfile: {
            phone: data?.patientProfile?.phone ?? payload.phone ?? ''
          }
        };

        // Atualiza a tabela imediatamente
        state.byId.set(String(novo.id), novo);
        upsertRow(novo);

        // Busca detalhe para garantir campos pós-criação
        try {
          const rd = await fetch(`/pacientes/${novo.id}`);
          if (rd.ok) {
            const det = await rd.json();
            const merged = {
              ...novo,
              name: det.name || novo.name,
              patientProfile: { phone: det?.patientProfile?.phone || novo.patientProfile.phone || '' }
            };
            state.byId.set(String(merged.id), merged);
            upsertRow(merged);
          }
        } catch {}

        fecharModal();
      } catch (err) {
        console.error(err);
        $error.textContent = (err?.message || 'Falha ao cadastrar paciente.');
      } finally {
        $btnSalvar.disabled = false;
        $btnSalvar.textContent = 'Salvar';
      }
    });
  }

  function fecharModal() {
    $modalRoot.classList.remove('is-open');
    $slot.innerHTML = '';
  }

  // Auto-refresh
  const REFRESH_MS = 10000;
  async function refreshList() {
    try {
      const r = await fetch('/pacientes/_list.json', { headers: { 'Accept': 'application/json' } });
      if (!r.ok) return;
      const json = await r.json();
      const incoming = Array.isArray(json?.items) ? json.items : [];
      const incomingMap = new Map(incoming.map(p => [String(p.id), p]));

      for (const p of incoming) {
        const id = String(p.id);
        const prev = state.byId.get(id);
        if (!prev ||
            prev.name !== p.name ||
            (prev.patientProfile?.phone || '') !== (p.patientProfile?.phone || '')) {
          state.byId.set(id, p);
          upsertRow(p);
        }
      }
      // se quiser remover quem sumiu, descomente:
      // for (const id of Array.from(state.byId.keys())) {
      //   if (!incomingMap.has(id)) {
      //     state.byId.delete(id);
      //     $tbody.querySelector(`tr[data-id="${id}"]`)?.remove();
      //   }
      // }
    } catch (e) {
      console.debug('refreshList falhou', e);
    }
  }
  setInterval(refreshList, REFRESH_MS);
})();
