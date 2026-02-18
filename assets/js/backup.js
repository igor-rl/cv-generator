/**
 * backup.js — Import / Export backup (.cvx format)
 * CVX = encrypted, device-specific, not human-readable
 */

window.BackupModule = (() => {

  // ── Exportar backup ──────────────────────────────────────────────
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

      App.showStatus('backup-status', 'success',
        `✓ Backup exportado! (${backup.vagas?.length||0} vagas, ${backup.curriculos?.length||0} currículos)`);
    } catch (err) {
      console.error('[Backup Export Error]', err);
      App.showStatus('backup-status', 'error', 'Erro ao exportar: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Exportar'; }
    }
  }

  // ── Importar backup ──────────────────────────────────────────────
  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const btn = document.getElementById('btn-import-label');

    try {
      const text   = await file.text();
      const backup = await CVX.decode(text);

      if (!backup.version) throw new Error('Arquivo inválido ou sem versão');

      await DB.importBackup(backup);

      App.showStatus('backup-status', 'success',
        `✓ Backup importado! (${backup.vagas?.length||0} vagas, ${backup.curriculos?.length||0} currículos). Recarregando…`);
      setTimeout(() => location.reload(), 1800);
    } catch (err) {
      console.error('[Backup Import Error]', err);
      App.showStatus('backup-status', 'error', 'Erro ao importar: ' + err.message);
    }

    event.target.value = '';
  }

  return { exportBackup, importBackup };
})();