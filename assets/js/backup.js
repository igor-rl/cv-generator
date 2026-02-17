/**
 * backup.js — Import / Export backup (JSON puro)
 */

window.BackupModule = (() => {

  async function exportBackup() {
    try {
      // pega todos os dados do DB
      const backup = await DB.exportBackup();
      
      // converte em JSON sem formatação (não legível)
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      
      a.href     = url;
      a.download = `backup-curriculos-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      App.showStatus('backup-status', 'success', '✓ Backup exportado com sucesso!');
    } catch (err) {
      App.showStatus('backup-status', 'error', 'Erro ao exportar: ' + err.message);
    }
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text   = await file.text();
      const backup = JSON.parse(text);

      if (!backup.version) throw new Error('Arquivo inválido');

      // importa todos os dados para os stores corretos
      await DB.importBackup(backup);

      App.showStatus('backup-status', 'success', '✓ Backup importado! Recarregando…');
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      App.showStatus('backup-status', 'error', 'Erro ao importar: ' + err.message);
    }

    event.target.value = '';
  }

  return { exportBackup, importBackup };
})();
