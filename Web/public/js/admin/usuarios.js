document.addEventListener('DOMContentLoaded', () => {
  const resultContainer = document.getElementById('resultContainer');
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  const modalUsuario = document.getElementById('modalUsuario');
  const modalProntuario = document.getElementById('modalProntuario');
  const btnNovoUsuario = document.getElementById('btnNovoUsuario');
  const fecharModalUsuario = document.getElementById('fecharModalUsuario');
  const fecharModalProntuario = document.getElementById('fecharModalProntuario');
  const formNovoUsuario = document.getElementById('formNovoUsuario');
  const cpfInput = document.getElementById('cpfInput');
  const cepInput = document.getElementById('cepInput');
  const enderecoInput = document.getElementById('enderecoInput');

  // Exibe a tabela ao buscar
  searchBtn.addEventListener('click', () => {
    if (searchInput.value.trim()) {
      resultContainer.classList.remove('hidden');
    }
  });

  // Abrir/Criar modal usuário
  btnNovoUsuario.addEventListener('click', () => modalUsuario.classList.remove('hidden'));
  fecharModalUsuario.addEventListener('click', () => modalUsuario.classList.add('hidden'));
  fecharModalProntuario.addEventListener('click', () => modalProntuario.classList.add('hidden'));

  // CPF máscara e validação simples
  cpfInput.addEventListener('input', () => {
    cpfInput.value = cpfInput.value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  });

  formNovoUsuario.addEventListener('submit', e => {
    e.preventDefault();
    alert('Usuário cadastrado com sucesso (simulação).');
    modalUsuario.classList.add('hidden');
  });

  // Fake CEP (auto preenchimento)
  cepInput.addEventListener('input', () => {
    if (cepInput.value.length === 8) {
      enderecoInput.value = 'Rua Exemplo, Bairro Central - Cidade Modelo';
    }
  });
});

function abrirProntuario() {
  document.getElementById('modalProntuario').classList.remove('hidden');
}
