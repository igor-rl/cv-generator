/**
 * profile.js — Personal information management
 */

window.ProfileModule = (() => {

  async function load() {
    const personal = await DB.getPersonal();
    if (personal) populate(personal);
  }

  function populate(p) {
    const fields = ['name','email','phone','city','state','linkedin','github','portfolio'];
    fields.forEach(f => {
      const el = document.getElementById(`pf_${f}`);
      if (el) el.value = p[f] || '';
    });

    const remoteEl = document.getElementById('pf_remote');
    if (remoteEl) remoteEl.checked = p.remote === true;

    // Visibility toggles
    const vis = ['phone','city','state','remote','linkedin','github','portfolio'];
    vis.forEach(f => {
      const el = document.getElementById(`vis_${f}`);
      if (el) el.checked = p[`include_${f}`] !== false;
    });
  }

  async function save() {
    const personal = {
      name:      v('pf_name'),
      email:     v('pf_email'),
      phone:     v('pf_phone'),
      city:      v('pf_city'),
      state:     v('pf_state'),
      remote:    document.getElementById('pf_remote').checked,
      linkedin:  v('pf_linkedin'),
      github:    v('pf_github'),
      portfolio: v('pf_portfolio'),

      // Always include name + email
      include_name:  true,
      include_email: true,

      // Visibility from toggles
      include_phone:     chk('vis_phone'),
      include_city:      chk('vis_city'),
      include_state:     chk('vis_state'),
      include_remote:    chk('vis_remote'),
      include_linkedin:  chk('vis_linkedin'),
      include_github:    chk('vis_github'),
      include_portfolio: chk('vis_portfolio'),
    };

    if (!personal.name || !personal.email) {
      App.showStatus('profile-status', 'error', 'Nome e email são obrigatórios!');
      return;
    }

    try {
      await DB.savePersonal(personal);
      App.showStatus('profile-status', 'success', '✓ Dados salvos com sucesso!');
    } catch (err) {
      App.showStatus('profile-status', 'error', 'Erro ao salvar: ' + err.message);
    }
  }

  function v(id) { return document.getElementById(id)?.value?.trim() || ''; }
  function chk(id) { return document.getElementById(id)?.checked === true; }

  return { load, save };
})();