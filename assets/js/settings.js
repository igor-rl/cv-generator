/**
 * settings.js — App configuration (GROQ API key, preferences)
 */

window.SettingsModule = (() => {

  async function load() {
    const cfg = await DB.getSettings();
    
    const groqKeyEl = document.getElementById('cfg_groq_key');
    if (groqKeyEl) groqKeyEl.value = cfg.groq_key || '';

    const groqModelEl = document.getElementById('cfg_groq_model');
    if (groqModelEl) groqModelEl.value = cfg.groq_model || 'llama-3.3-70b-versatile';

    updateGroqStatus(cfg.groq_key);
  }

  function updateGroqStatus(key) {
    const statusEl = document.getElementById('groq-status-indicator');
    if (!statusEl) return;

    if (key && key.startsWith('gsk_') && key.length > 20) {
      statusEl.className = 'groq-status groq-active';
      statusEl.innerHTML = `
        <span class="groq-dot"></span>
        <span>GROQ ativo — geração automática habilitada</span>`;
    } else {
      statusEl.className = 'groq-status groq-inactive';
      statusEl.innerHTML = `
        <span class="groq-dot"></span>
        <span>Sem GROQ — usando fluxo manual (copiar/colar no ChatGPT)</span>`;
    }
  }

  async function save() {
    const groqKey   = document.getElementById('cfg_groq_key')?.value?.trim() || '';
    const groqModel = document.getElementById('cfg_groq_model')?.value || 'llama-3.3-70b-versatile';

    const cfg = await DB.getSettings();
    await DB.saveSettings({ ...cfg, groq_key: groqKey, groq_model: groqModel });

    updateGroqStatus(groqKey);
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
        updateGroqStatus(groqKey);
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

  return { load, save, testGroq, toggleKeyVisibility };
})();