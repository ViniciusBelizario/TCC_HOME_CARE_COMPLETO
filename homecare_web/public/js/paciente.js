// public/js/paciente.js
(function () {
  // Dados iniciais vindos do servidor
  const pacientes = window.PACIENTES || [];
  const $tbody = document.getElementById('pacientesTbody');

  // Modal root
  const $modalRoot = document.querySelector('.modal-root');
  const $slot = $modalRoot.querySelector('.modal-slot');

  // --- garanta que o modal está diretamente em <body> (evita layout "puxando" pro lado/topo)
  (function ensureModalOnBody() {
    if ($modalRoot && $modalRoot.parentElement !== document.body) {
      document.body.appendChild($modalRoot);
    }
  })();

  // Fechar modal clicando no backdrop ou em elementos com [data-close]
  $modalRoot.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) fecharModal();
    if (e.target.closest('[data-close]')) {
      e.preventDefault();
      fecharModal();
    }
  });

  // Delegação: botão "Detalhe" dentro da tabela
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-detail');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    abrirDetalhe(id);
  });

  // Botão principal "Cadastrar Paciente"
  const btnCadastrar = document.getElementById('btnCadastrar');
  btnCadastrar?.addEventListener('click', () => abrirCadastro());

  // ==============
  //  Detalhe
  // ==============
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
              <div class="row"><div class="label">E-mail</div><div class="value">${p.email}</div></div>
              <div class="row"><div class="label">CPF</div><div class="value">${p.cpf}</div></div>
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

  // ==============
  //  Cadastro
  // ==============
  function abrirCadastro() {
    const hoje = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
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

      // validações básicas
      if (!payload.name || !payload.email || !payload.cpf || !payload.password) {
        $error.textContent = 'Preencha nome, e-mail, CPF e senha.';
        return;
      }
      payload.cpf = (payload.cpf || '').replace(/\D/g, '');
      if (payload.cpf.length !== 11) {
        $error.textContent = 'CPF deve ter 11 dígitos.';
        return;
      }

      try {
        $btnSalvar.disabled = true;
        $btnSalvar.textContent = 'Salvando...';

        const r = await fetch('/pacientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await r.json();

        if (!r.ok) {
          throw new Error(data?.error || 'Erro no cadastro');
        }

        // monta objeto básico para inserir na tabela
        const novo = {
          id: data?.id ?? data?.userId ?? data?.patient?.id ?? '—',
          name: data?.name ?? data?.patient?.name ?? payload.name,
          phone: data?.patientProfile?.phone ?? data?.phone ?? payload.phone ?? '-'
        };

        appendRow(novo);
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

  // Insere uma nova linha na tabela (no topo)
  function appendRow(p) {
    const tr = document.createElement('tr');
    tr.dataset.id = p.id;
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${p.phone || '-'}</td>
      <td><button class="btn btn--sm btn-detail">Detalhe</button></td>
    `;
    $tbody.prepend(tr);
  }

  function fecharModal() {
    $modalRoot.classList.remove('is-open');
    $slot.innerHTML = '';
  }
})();
