/**
 * backup.js — Import / Export backup (JSON puro)
 */

window.BackupModule = (() => {

  // ── Exportar backup ──────────────────────────────────────────────
  async function exportBackup() {
    try {
      const backup = await DB.exportBackup();

      // Pequeno log estratégico
      console.log(`[Backup Export] Personal: ${backup.personal ? '✓' : '✗'}, Vagas: ${backup.vagas.length}, Currículos: ${backup.curriculos.length}`);

      // Converte em JSON puro
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');

      a.href     = url;
      a.download = `backup-curriculos-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      App.showStatus('backup-status', 'success', '✓ Backup exportado com sucesso!');
    } catch (err) {
      console.error('[Backup Export Error]', err);
      App.showStatus('backup-status', 'error', 'Erro ao exportar: ' + err.message);
    }
  }

  // ── Importar backup ──────────────────────────────────────────────
  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text   = await file.text();
      const backup = JSON.parse(text);

      if (!backup.version) throw new Error('Arquivo inválido ou sem versão');

      // Chama o import genérico do DB
      await DB.importBackup(backup);

      // Log estratégico
      console.log(`[Backup Import] Personal: ${backup.personal ? '✓' : '✗'}, Vagas: ${backup.vagas?.length || 0}, Currículos: ${backup.curriculos?.length || 0}`);

      App.showStatus('backup-status', 'success', '✓ Backup importado com sucesso! Recarregando…');
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      console.error('[Backup Import Error]', err);
      App.showStatus('backup-status', 'error', 'Erro ao importar: ' + err.message);
    }

    // Limpa input para permitir novo upload
    event.target.value = '';
  }

  return { exportBackup, importBackup };
})();
