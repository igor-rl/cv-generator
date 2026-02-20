/**
 * settings.js — App configuration (GROQ API key, enable toggle, backup)
 * Now consolidates GROQ config + Backup into a single tabbed page.
 */

window.SettingsModule = (() => {

  // ── Tab switching ─────────────────────────────────────────────────────────
  function switchTab(tabName) {
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.settings-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `settings-tab-${tabName}`);
    });
  }

  async function load() {
    const cfg = await DB.getSettings();

    const groqKeyEl = document.getElementById('cfg_groq_key');
    if (groqKeyEl) groqKeyEl.value = cfg.groq_key || '';

    const groqModelEl = document.getElementById('cfg_groq_model');
    if (groqModelEl) groqModelEl.value = cfg.groq_model || 'llama-3.3-70b-versatile';

    // Load the enable toggle — defaults to true if key exists, false otherwise
    const enableEl = document.getElementById('cfg_groq_enabled');
    if (enableEl) {
      // groq_enabled defaults to true if the key is set, false if not
      const defaultEnabled = !!(cfg.groq_key && cfg.groq_key.startsWith('gsk_'));
      enableEl.checked = cfg.groq_enabled !== undefined ? cfg.groq_enabled : defaultEnabled;
    }

    updateGroqStatus(cfg.groq_key, cfg.groq_enabled);
  }

  function updateGroqStatus(key, enabled) {
    const statusEl = document.getElementById('groq-status-indicator');
    if (!statusEl) return;

    const hasKey = !!(key && key.startsWith('gsk_') && key.length > 20);
    const isEnabled = enabled !== false; // defaults to true

    if (hasKey && isEnabled) {
      statusEl.className = 'groq-status groq-active';
      statusEl.innerHTML = `
        <span class="groq-dot"></span>
        <span>GROQ ativo — geração automática habilitada</span>`;
    } else if (hasKey && !isEnabled) {
      statusEl.className = 'groq-status groq-inactive';
      statusEl.innerHTML = `
        <span class="groq-dot"></span>
        <span>GROQ desabilitado — usando fluxo manual mesmo com chave configurada</span>`;
    } else {
      statusEl.className = 'groq-status groq-inactive';
      statusEl.innerHTML = `
        <span class="groq-dot"></span>
        <span>Sem GROQ — usando fluxo manual (copiar/colar no ChatGPT)</span>`;
    }
  }

  async function save() {
    const groqKey     = document.getElementById('cfg_groq_key')?.value?.trim() || '';
    const groqModel   = document.getElementById('cfg_groq_model')?.value || 'llama-3.3-70b-versatile';
    const groqEnabled = document.getElementById('cfg_groq_enabled')?.checked !== false;

    const cfg = await DB.getSettings();
    await DB.saveSettings({ ...cfg, groq_key: groqKey, groq_model: groqModel, groq_enabled: groqEnabled });

    updateGroqStatus(groqKey, groqEnabled);
    App.showStatus('settings-status', 'success', '✓ Configurações salvas!');
  }

  async function testGroq() {
    const groqKey = document.getElementById('cfg_groq_key')?.value?.trim();
    if (!groqKey) {
      App.showStatus('settings-status', 'error', 'Informe a chave GROQ primeiro.');
      return;
    }

    const btn = document.getElementById('btn-test-groq');
    if (btn) { btn.disabled = true; btn.textContent = 'Testando…'; }

    try {
      const result = await GROQ.test(groqKey);
      if (result.ok) {
        App.showStatus('settings-status', 'success', `✓ GROQ OK! Modelo: ${result.model}`);
        const cfg = await DB.getSettings();
        updateGroqStatus(groqKey, cfg.groq_enabled);
      } else {
        App.showStatus('settings-status', 'error', '✗ Chave inválida ou sem acesso: ' + result.error);
      }
    } catch (err) {
      App.showStatus('settings-status', 'error', '✗ Erro ao testar: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Testar Chave'; }
    }
  }

  function toggleKeyVisibility() {
    const el = document.getElementById('cfg_groq_key');
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
  }

  // ── Backup functions (merged from backup.js) ──────────────────────────────
  async function exportBackup() {
    const btn = document.getElementById('btn-export');
    if (btn) { btn.disabled = true; btn.textContent = 'Exportando…'; }

    try {
      const backup  = await DB.exportBackup();
      const cvxData = await CVX.encode(backup);

      const blob = new Blob([cvxData], { type: 'application/octet-stream' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `curriculos-${new Date().toISOString().split('T')[0]}.cvx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      App.showStatus('settings-status', 'success',
        `✓ Backup exportado! (${backup.vagas?.length||0} vagas, ${backup.curriculos?.length||0} currículos)`);
    } catch (err) {
      console.error('[Backup Export Error]', err);
      App.showStatus('settings-status', 'error', 'Erro ao exportar: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Exportar .cvx'; }
    }
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text   = await file.text();
      const backup = await CVX.decode(text);

      if (!backup.version) throw new Error('Arquivo inválido ou sem versão');

      await DB.importBackup(backup);

      App.showStatus('settings-status', 'success',
        `✓ Backup importado! (${backup.vagas?.length||0} vagas, ${backup.curriculos?.length||0} currículos). Recarregando…`);
      setTimeout(() => location.reload(), 1800);
    } catch (err) {
      console.error('[Backup Import Error]', err);
      App.showStatus('settings-status', 'error', 'Erro ao importar: ' + err.message);
    }

    event.target.value = '';
  }

  return { load, save, testGroq, toggleKeyVisibility, switchTab, exportBackup, importBackup };
})();