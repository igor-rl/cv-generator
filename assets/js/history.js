/**
 * history.js — Structured history management
 * Experiences, Education, Certifications, Languages
 */

window.HistoryModule = (() => {
  let editingItem = null;
  let editingType = null;

  // ── EXPERIENCES ───────────────────────────────────────────────────────────

  async function loadExperiences() {
    const items = await DB.listExperiences();
    renderList(items, 'exp-list', renderExperienceItem, 'Nenhuma experiência cadastrada.');
  }

  function renderExperienceItem(exp) {
    const period = `${App.formatYearMonth(exp.startDate)} – ${exp.current ? 'Atual' : App.formatYearMonth(exp.endDate)}`;
    return `
      <div class="history-item">
        <div class="history-item-content">
          <div class="history-item-title">${App.esc(exp.role)}</div>
          <div class="history-item-subtitle">${App.esc(exp.company)}</div>
          <div class="history-item-meta">${period}${exp.location ? ' · ' + App.esc(exp.location) : ''}</div>
        </div>
        <div class="history-item-actions">
          <button class="btn btn-ghost btn-icon" onclick="HistoryModule.editExperience(${exp.id})" title="Editar">
            ${icons.edit}
          </button>
          <button class="btn btn-ghost btn-icon" onclick="HistoryModule.deleteItem('experiences',${exp.id},'exp')" title="Excluir">
            ${icons.trash}
          </button>
        </div>
      </div>`;
  }

  async function editExperience(id) {
    const items = await DB.listExperiences();
    const item  = items.find(i => i.id === id);
    if (!item) return;

    editingItem = item;
    editingType = 'exp';

    setVal('exp_role', item.role);
    setVal('exp_company', item.company);
    setVal('exp_location', item.location);
    setVal('exp_startDate', item.startDate);
    setVal('exp_endDate', item.endDate);
    setVal('exp_stack', item.stack);
    setVal('exp_description', item.description);
    document.getElementById('exp_current').checked = item.current === true;
    document.getElementById('expModalTitle').textContent = 'Editar Experiência';
    App.openModal('expModal');
  }

  function openNewExperience() {
    editingItem = null;
    editingType = 'exp';
    clearForm(['exp_role','exp_company','exp_location','exp_startDate','exp_endDate','exp_stack','exp_description']);
    document.getElementById('exp_current').checked = false;
    document.getElementById('expModalTitle').textContent = 'Nova Experiência';
    App.openModal('expModal');
  }

  async function saveExperience() {
    const role    = v('exp_role');
    const company = v('exp_company');

    if (!role || !company) {
      App.showStatus('exp-modal-status','error','Cargo e empresa são obrigatórios!');
      return;
    }

    const item = {
      ...(editingItem || {}),
      role,
      company,
      location:    v('exp_location'),
      startDate:   v('exp_startDate'),
      endDate:     document.getElementById('exp_current').checked ? null : v('exp_endDate'),
      current:     document.getElementById('exp_current').checked,
      stack:       v('exp_stack'),
      description: v('exp_description'),
    };

    try {
      await DB.saveExperience(item);
      App.closeModal('expModal');
      loadExperiences();
    } catch (err) {
      App.showStatus('exp-modal-status','error','Erro: ' + err.message);
    }
  }

  // ── EDUCATION ─────────────────────────────────────────────────────────────

  async function loadEducation() {
    const items = await DB.listEducation();
    renderList(items, 'edu-list', renderEducationItem, 'Nenhuma formação cadastrada.');
  }

  function renderEducationItem(edu) {
    const period = [edu.startDate, edu.endDate].filter(Boolean).join(' – ');
    return `
      <div class="history-item">
        <div class="history-item-content">
          <div class="history-item-title">${App.esc(edu.degree)}</div>
          <div class="history-item-subtitle">${App.esc(edu.institution)}</div>
          <div class="history-item-meta">${period}</div>
        </div>
        <div class="history-item-actions">
          <button class="btn btn-ghost btn-icon" onclick="HistoryModule.editEducation(${edu.id})" title="Editar">
            ${icons.edit}
          </button>
          <button class="btn btn-ghost btn-icon" onclick="HistoryModule.deleteItem('education',${edu.id},'edu')" title="Excluir">
            ${icons.trash}
          </button>
        </div>
      </div>`;
  }

  async function editEducation(id) {
    const items = await DB.listEducation();
    const item  = items.find(i => i.id === id);
    if (!item) return;

    editingItem = item;
    editingType = 'edu';
    setVal('edu_degree', item.degree);
    setVal('edu_institution', item.institution);
    setVal('edu_startDate', item.startDate);
    setVal('edu_endDate', item.endDate);
    setVal('edu_notes', item.notes);
    document.getElementById('eduModalTitle').textContent = 'Editar Formação';
    App.openModal('eduModal');
  }

  function openNewEducation() {
    editingItem = null;
    clearForm(['edu_degree','edu_institution','edu_startDate','edu_endDate','edu_notes']);
    document.getElementById('eduModalTitle').textContent = 'Nova Formação';
    App.openModal('eduModal');
  }

  async function saveEducation() {
    const degree      = v('edu_degree');
    const institution = v('edu_institution');

    if (!degree || !institution) {
      App.showStatus('edu-modal-status','error','Curso e instituição são obrigatórios!');
      return;
    }

    const item = {
      ...(editingItem || {}),
      degree,
      institution,
      startDate: v('edu_startDate'),
      endDate:   v('edu_endDate'),
      notes:     v('edu_notes'),
    };

    try {
      await DB.saveEducation(item);
      App.closeModal('eduModal');
      loadEducation();
    } catch (err) {
      App.showStatus('edu-modal-status','error','Erro: ' + err.message);
    }
  }

  // ── CERTIFICATIONS ────────────────────────────────────────────────────────

  async function loadCertifications() {
    const items = await DB.listCertifications();
    renderList(items, 'certs-list', renderCertItem, 'Nenhuma certificação cadastrada.');
  }

  function renderCertItem(cert) {
    return `
      <div class="history-item">
        <div class="history-item-content">
          <div class="history-item-title">${App.esc(cert.name)}</div>
          <div class="history-item-subtitle">${App.esc(cert.issuer)}</div>
          <div class="history-item-meta">${cert.date || ''}</div>
        </div>
        <div class="history-item-actions">
          <button class="btn btn-ghost btn-icon" onclick="HistoryModule.editCert(${cert.id})" title="Editar">
            ${icons.edit}
          </button>
          <button class="btn btn-ghost btn-icon" onclick="HistoryModule.deleteItem('certifications',${cert.id},'certs')" title="Excluir">
            ${icons.trash}
          </button>
        </div>
      </div>`;
  }

  async function editCert(id) {
    const items = await DB.listCertifications();
    const item  = items.find(i => i.id === id);
    if (!item) return;

    editingItem = item;
    setVal('cert_name', item.name);
    setVal('cert_issuer', item.issuer);
    setVal('cert_date', item.date);
    setVal('cert_credential', item.credential_id);
    document.getElementById('certModalTitle').textContent = 'Editar Certificação';
    App.openModal('certModal');
  }

  function openNewCert() {
    editingItem = null;
    clearForm(['cert_name','cert_issuer','cert_date','cert_credential']);
    document.getElementById('certModalTitle').textContent = 'Nova Certificação';
    App.openModal('certModal');
  }

  async function saveCert() {
    const name   = v('cert_name');
    const issuer = v('cert_issuer');

    if (!name || !issuer) {
      App.showStatus('cert-modal-status','error','Nome e emissor são obrigatórios!');
      return;
    }

    const item = {
      ...(editingItem || {}),
      name,
      issuer,
      date:          v('cert_date'),
      credential_id: v('cert_credential'),
    };

    try {
      await DB.saveCertification(item);
      App.closeModal('certModal');
      loadCertifications();
    } catch (err) {
      App.showStatus('cert-modal-status','error','Erro: ' + err.message);
    }
  }

  // ── LANGUAGES ─────────────────────────────────────────────────────────────

  async function loadLanguages() {
    const items = await DB.listLanguages();
    renderList(items, 'langs-list', renderLangItem, 'Nenhum idioma cadastrado.');
  }

  function renderLangItem(lang) {
    return `
      <div class="history-item">
        <div class="history-item-content">
          <div class="history-item-title">${App.esc(lang.language)}</div>
          <div class="history-item-subtitle">${App.esc(lang.proficiency)}</div>
        </div>
        <div class="history-item-actions">
          <button class="btn btn-ghost btn-icon" onclick="HistoryModule.editLang(${lang.id})" title="Editar">
            ${icons.edit}
          </button>
          <button class="btn btn-ghost btn-icon" onclick="HistoryModule.deleteItem('languages',${lang.id},'langs')" title="Excluir">
            ${icons.trash}
          </button>
        </div>
      </div>`;
  }

  async function editLang(id) {
    const items = await DB.listLanguages();
    const item  = items.find(i => i.id === id);
    if (!item) return;

    editingItem = item;
    setVal('lang_language', item.language);
    setVal('lang_proficiency', item.proficiency);
    document.getElementById('langModalTitle').textContent = 'Editar Idioma';
    App.openModal('langModal');
  }

  function openNewLang() {
    editingItem = null;
    clearForm(['lang_language']);
    document.getElementById('lang_proficiency').value = 'intermediário';
    document.getElementById('langModalTitle').textContent = 'Novo Idioma';
    App.openModal('langModal');
  }

  async function saveLang() {
    const language    = v('lang_language');
    const proficiency = v('lang_proficiency');

    if (!language) {
      App.showStatus('lang-modal-status','error','Idioma é obrigatório!');
      return;
    }

    const item = {
      ...(editingItem || {}),
      language,
      proficiency,
    };

    try {
      await DB.saveLanguage(item);
      App.closeModal('langModal');
      loadLanguages();
    } catch (err) {
      App.showStatus('lang-modal-status','error','Erro: ' + err.message);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function deleteItem(store, id, reloadPage) {
    App.confirm(
      'Excluir item',
      'Tem certeza? Essa ação não pode ser desfeita.',
      async () => {
        switch (store) {
          case 'experiences':    await DB.deleteExperience(id);    loadExperiences(); break;
          case 'education':      await DB.deleteEducation(id);     loadEducation();   break;
          case 'certifications': await DB.deleteCertification(id); loadCertifications(); break;
          case 'languages':      await DB.deleteLanguage(id);      loadLanguages();   break;
        }
      }
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const icons = {
    edit:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  };

  function renderList(items, containerId, renderFn, emptyMsg) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!items.length) {
      container.innerHTML = `<div class="empty-state" style="padding:40px 0;">
        <p style="color:#8b92a8;">${emptyMsg}</p>
      </div>`;
      return;
    }
    container.innerHTML = `<div class="history-list">${items.map(renderFn).join('')}</div>`;
  }

  function v(id)    { return document.getElementById(id)?.value?.trim() || ''; }
  function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val || ''; }
  function clearForm(ids) { ids.forEach(id => setVal(id, '')); }

  return {
    loadExperiences, editExperience, openNewExperience, saveExperience,
    loadEducation,   editEducation,   openNewEducation,   saveEducation,
    loadCertifications, editCert, openNewCert, saveCert,
    loadLanguages,   editLang,   openNewLang,   saveLang,
    deleteItem,
  };
})();