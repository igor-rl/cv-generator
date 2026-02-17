// main.js — Gerenciamento de dados pessoais
// Usa IndexedDB (via DB global de db.js) em vez de fetch para o servidor

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  await loadFromDB();
  handleInstallPrompt();

  // Se chegou via shortcut ?tab=vagas&action=nova
  const params = new URLSearchParams(location.search);
  if (params.get('tab')) switchTab(params.get('tab'));
  if (params.get('action') === 'nova') {
    setTimeout(() => openNovaVagaModal?.(), 300);
  }
});

// ── Tabs ──────────────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  const content = document.getElementById(`tab-${tabName}`);
  if (btn) btn.classList.add('active');
  if (content) content.classList.add('active');
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadFromDB() {
  try {
    const [personal, history] = await Promise.all([
      DB.getPersonal(),
      DB.getHistory(),
    ]);
    if (personal) preencherDadosPessoais(personal);
    const historyField = document.getElementById('history');
    if (historyField && history) historyField.value = history;
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
  }
}

function preencherDadosPessoais(personal) {
  const campos = ['name', 'email', 'phone', 'city', 'state', 'linkedin', 'github', 'portfolio'];
  campos.forEach(campo => {
    const el = document.getElementById(campo);
    if (el && personal[campo] !== undefined) el.value = personal[campo];
  });
  const remoteEl = document.getElementById('remote');
  if (remoteEl) remoteEl.checked = personal.remote === true;

  const checkboxes = [
    'include_phone', 'include_city', 'include_state',
    'include_remote', 'include_linkedin', 'include_github', 'include_portfolio',
  ];
  checkboxes.forEach(campo => {
    const el = document.getElementById(campo);
    if (el && personal[campo] !== undefined) el.checked = personal[campo] === true;
  });
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function saveData() {
  const personal = {
    name:      document.getElementById('name').value.trim(),
    email:     document.getElementById('email').value.trim(),
    phone:     document.getElementById('phone').value.trim(),
    city:      document.getElementById('city').value.trim(),
    state:     document.getElementById('state').value.trim(),
    remote:    document.getElementById('remote').checked,
    linkedin:  document.getElementById('linkedin').value.trim(),
    github:    document.getElementById('github').value.trim(),
    portfolio: document.getElementById('portfolio').value.trim(),
    include_name:      true,
    include_email:     true,
    include_phone:     document.getElementById('include_phone').checked,
    include_city:      document.getElementById('include_city').checked,
    include_state:     document.getElementById('include_state').checked,
    include_remote:    document.getElementById('include_remote').checked,
    include_linkedin:  document.getElementById('include_linkedin').checked,
    include_github:    document.getElementById('include_github').checked,
    include_portfolio: document.getElementById('include_portfolio').checked,
  };

  const history = document.getElementById('history').value.trim();

  if (!personal.name || !personal.email) {
    showStatus('error', 'Nome e email são obrigatórios!'); return;
  }
  if (!history) {
    showStatus('error', 'Histórico profissional é obrigatório!'); return;
  }

  try {
    await Promise.all([DB.savePersonal(personal), DB.saveHistory(history)]);
    showStatus('success', '✅ Dados salvos com sucesso!');
  } catch (err) {
    console.error(err);
    showStatus('error', '❌ Erro ao salvar dados: ' + err.message);
  }
}

function showStatus(type, msg) {
  const s = document.getElementById('saveStatus');
  s.className = `status ${type}`;
  s.textContent = msg;
  s.style.display = 'block';
  setTimeout(() => { s.style.display = 'none'; }, 5000);
}

// ── Backup Export / Import ────────────────────────────────────────────────────
async function exportarBackup() {
  try {
    const backup = await DB.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `backup-curriculos-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('success', '✅ Backup exportado!');
  } catch (err) {
    showStatus('error', '❌ Erro ao exportar backup: ' + err.message);
  }
}

async function importarBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text   = await file.text();
    const backup = JSON.parse(text);
    if (!backup.version) throw new Error('Arquivo de backup inválido');
    await DB.importBackup(backup);
    showStatus('success', '✅ Backup importado com sucesso! Recarregando…');
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    showStatus('error', '❌ Erro ao importar backup: ' + err.message);
  }
  // Limpar input
  event.target.value = '';
}

// ── PWA Install Prompt ────────────────────────────────────────────────────────
let deferredInstallPrompt = null;

function handleInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'flex';
  });

  window.addEventListener('appinstalled', () => {
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'none';
    deferredInstallPrompt = null;
  });
}

async function instalarApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'none';
  }
  deferredInstallPrompt = null;
}

// ── Service Worker registration ───────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registrado:', reg.scope))
      .catch(err => console.warn('SW falhou:', err));
  });
}
