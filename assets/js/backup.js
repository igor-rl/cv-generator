/**
 * backup.js — Import / Export backup (JSON puro)
 */

window.BackupModule = (() => {

  async function exportBackup() {
    try {
      // Pega todos os dados do DB em formato completo
      const backup = {
        version: 2,
        exportedAt: new Date().toISOString(),
        personal: await DB.getPersonal(),
        vagas: await DB.getVagas(),
        curriculos: await DB.getCurriculos(),
        experiences: await DB.getExperiences(),
        education: await DB.getEducation(),
        certifications: await DB.getCertifications(),
        languages: await DB.getLanguages()
      };

      // Converte em JSON puro (não legível para humanos)
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

      // Importa cada seção para os stores corretos
      if (backup.personal) await DB.setPersonal(backup.personal);
      if (backup.vagas) await DB.setVagas(backup.vagas);
      if (backup.curriculos) await DB.setCurriculos(backup.curriculos);
      if (backup.experiences) await DB.setExperiences(backup.experiences);
      if (backup.education) await DB.setEducation(backup.education);
      if (backup.certifications) await DB.setCertifications(backup.certifications);
      if (backup.languages) await DB.setLanguages(backup.languages);

      App.showStatus('backup-status', 'success', '✓ Backup importado! Recarregando…');
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      App.showStatus('backup-status', 'error', 'Erro ao importar: ' + err.message);
    }

    event.target.value = '';
  }

  return { exportBackup, importBackup };
})();
