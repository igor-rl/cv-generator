/**
 * vagas.js — Job listings management v4
 * - GROQ auto-generation (respects groq_enabled toggle)
 * - "Sugerir Alteração" instead of Edit JSON
 * - Scrollable modal fix
 */

window.VagasModule = (() => {
  let allVagas     = [];
  let filtered     = [];
  let currentPage  = 1;
  const perPage    = 10;
  let activeVaga   = null;
  let activeCurr   = null;

  // ── Icons ─────────────────────────────────────────────────────────────────
  const ico = {
    eye:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    edit:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    plus:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    copy:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    print:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
    rocket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>`,
    suggest:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    spark:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  async function load() {
    allVagas = await DB.listVagas();
    applyFilters();
  }

  function applyFilters() {
    const statusVal = document.getElementById('v_statusFilter')?.value || 'all';
    const sortVal   = document.getElementById('v_sort')?.value || 'newest';

    filtered = statusVal === 'all' ? [...allVagas] : allVagas.filter(v => v.status === statusVal);

    filtered.sort((a, b) => {
      const da = new Date(a.data_cadastro), db = new Date(b.data_cadastro);
      return sortVal === 'oldest' ? da - db : db - da;
    });

    currentPage = 1;
    render();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  async function render() {
    const start   = (currentPage - 1) * perPage;
    const page    = filtered.slice(start, start + perPage);
    const list    = document.getElementById('vagasList');
    const counter = document.getElementById('vagasCounter');

    if (counter) counter.textContent = `${filtered.length} vaga${filtered.length !== 1 ? 's' : ''}`;

    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">💼</span>
          <h3>Nenhuma vaga encontrada</h3>
          <p>Comece adicionando sua primeira oportunidade.</p>
          <button class="btn btn-primary btn-sm" onclick="VagasModule.openNew()">
            ${ico.plus} Nova Vaga
          </button>
        </div>`;
      document.getElementById('vagasPagination').innerHTML = '';
      return;
    }

    const checks = await Promise.all(page.map(v => DB.existsCurriculo(v.uuid)));

    list.innerHTML = page.map((vaga, i) => {
      const hasCurr = checks[i];
      const eli     = vaga._eligibility || null;
      const eliTag  = eli ? renderEligibilityTag(eli) : (hasCurr ? '<span class="vaga-card-eligibility eligibility-none">Sem pontuação</span>' : '');

      return `
      <div class="vaga-card" onclick="VagasModule.openDetail('${vaga.uuid}')">
        <div class="vaga-card-header">
          <div>
            <div class="vaga-card-title">${App.esc(vaga.cargo)}</div>
            <div class="vaga-card-empresa">${App.esc(vaga.empresa)}</div>
          </div>
          <span class="badge badge-${vaga.status}">${formatStatus(vaga.status)}</span>
        </div>
        <div class="vaga-card-meta">
          <span>📅 ${App.formatDate(vaga.data_cadastro)}</span>
          ${hasCurr ? '<span class="badge" style="background:var(--success-light);color:#065f46;">✓ Currículo gerado</span>' : ''}
        </div>
        ${eliTag}
        <div class="vaga-card-footer">
          <div style="font-size:12px;color:#8b92a8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:65%;">
            ${App.esc((vaga.descricao||'').substring(0, 100))}…
          </div>
          <div class="vaga-card-actions" onclick="event.stopPropagation()">
            <button class="btn btn-ghost btn-icon" title="Editar" onclick="VagasModule.openEdit('${vaga.uuid}')">
              ${ico.edit}
            </button>
            <button class="btn btn-ghost btn-icon" title="Excluir" onclick="VagasModule.remove('${vaga.uuid}')">
              ${ico.trash}
            </button>
          </div>
        </div>
      </div>`;
    }).join('');

    renderPagination();
  }

  function renderEligibilityTag(eli) {
    const stars = eli.pontuacao_estrelas || 0;
    let cls = 'eligibility-none';
    if (stars >= 4) cls = 'eligibility-high';
    else if (stars >= 3) cls = 'eligibility-medium';
    else if (stars >= 1) cls = 'eligibility-low';

    return `<div class="vaga-card-eligibility ${cls}">
      ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} ${App.esc(eli.status)}
    </div>`;
  }

  function renderPagination() {
    const total = Math.ceil(filtered.length / perPage);
    const el    = document.getElementById('vagasPagination');
    if (total <= 1) { el.innerHTML = ''; return; }

    let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="VagasModule.goPage(${currentPage - 1})">←</button>`;
    for (let i = 1; i <= total; i++) {
      html += `<button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="VagasModule.goPage(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" ${currentPage === total ? 'disabled' : ''} onclick="VagasModule.goPage(${currentPage + 1})">→</button>`;
    el.innerHTML = html;
  }

  function goPage(p) { currentPage = p; render(); }

  // ── Detail Modal ──────────────────────────────────────────────────────────
  async function openDetail(uuid) {
    activeVaga = allVagas.find(v => v.uuid === uuid);
    if (!activeVaga) return;

    const hasCurr = await DB.existsCurriculo(uuid);
    activeCurr    = hasCurr ? await DB.getCurriculo(uuid) : null;

    document.getElementById('detail_cargo').textContent   = activeVaga.cargo;
    document.getElementById('detail_empresa').textContent = activeVaga.empresa;
    document.getElementById('detail_status').className    = `badge badge-${activeVaga.status}`;
    document.getElementById('detail_status').textContent  = formatStatus(activeVaga.status);
    document.getElementById('detail_date').textContent    = App.formatDate(activeVaga.data_cadastro);
    document.getElementById('detail_descricao').textContent = activeVaga.descricao;

    const eliSection = document.getElementById('detail_eligibility_section');
    if (activeCurr?.elegibilidade) {
      eliSection.style.display = 'block';
      eliSection.innerHTML     = renderEligibilityMini(activeCurr.elegibilidade);
    } else {
      eliSection.style.display = 'none';
    }

    const actionsEl = document.getElementById('detail_actions');
    const cfg       = await DB.getSettings();
    // GROQ is active only if key exists AND enabled toggle is on
    const hasGroq   = !!(cfg.groq_key && cfg.groq_key.startsWith('gsk_') && cfg.groq_enabled !== false);

    const groqBadge = hasGroq
      ? `<span style="font-size:11px;background:var(--success-light);color:#065f46;padding:3px 8px;border-radius:99px;font-weight:600;">⚡ GROQ</span>`
      : '';

    actionsEl.innerHTML = hasCurr
      ? `
        <button class="btn btn-success" onclick="VagasModule.viewResume()">
          ${ico.eye} Ver Currículo
        </button>
        <button class="btn btn-primary btn-sm" onclick="VagasModule.startGeneration()">
          ${ico.rocket} Regen. ${groqBadge}
        </button>
        <button class="btn btn-secondary btn-sm" onclick="VagasModule.openSuggestChange()">
          ${ico.suggest} Sugerir Alteração
        </button>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="VagasModule.removeResume()">
          ${ico.trash}
        </button>`
      : `
        <button class="btn btn-primary" onclick="VagasModule.startGeneration()">
          ${ico.rocket} Gerar currículo com IA ${groqBadge}
        </button>`;

    App.openModal('vagaDetailModal');
  }

  function renderEligibilityMini(eli) {
    const stars = eli.pontuacao_estrelas || 0;
    const cls   = getEliClass(eli.status);
    return `
      <div class="eligibility-score-card" style="margin:0;margin-bottom:16px;">
        <div class="stars-display">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>
        <div class="eligibility-status ${cls}">${App.esc(eli.status)}</div>
        ${eli.pontuacao_percentual ? `<div class="eligibility-percent">${eli.pontuacao_percentual}% compatibilidade</div>` : ''}
        <div style="font-size:13px;margin-top:8px;color:#6b7589;">${App.esc(eli.recomendacao)}</div>
      </div>`;
  }

  // ── New / Edit Vaga ───────────────────────────────────────────────────────
  function openNew() {
    activeVaga = null;
    setVals({ v_empresa: '', v_cargo: '', v_descricao: '', v_url: '' });
    document.getElementById('vagaFormTitle').textContent = 'Nova Vaga';
    document.getElementById('vagaFormStatus').style.display = 'none';
    App.openModal('vagaFormModal');
  }

  function openEdit(uuid) {
    const vaga = allVagas.find(v => v.uuid === uuid);
    if (!vaga) return;
    activeVaga = vaga;
    setVals({ v_empresa: vaga.empresa, v_cargo: vaga.cargo, v_descricao: vaga.descricao });
    document.getElementById('vagaFormTitle').textContent = 'Editar Vaga';
    document.getElementById('vagaFormStatus').style.display = 'block';
    document.getElementById('v_status').value = vaga.status;
    App.closeModal('vagaDetailModal');
    App.openModal('vagaFormModal');
  }

  async function saveVaga() {
    const empresa   = gv('v_empresa');
    const cargo     = gv('v_cargo');
    const descricao = gv('v_descricao');

    if (!empresa || !cargo || !descricao) {
      App.showStatus('vaga-form-status', 'error', 'Todos os campos são obrigatórios!');
      return;
    }

    try {
      if (activeVaga) {
        const status = document.getElementById('v_status')?.value || activeVaga.status;
        await DB.updateVaga(activeVaga.uuid, { empresa, cargo, descricao, status });
      } else {
        await DB.createVaga({ empresa, cargo, descricao });
      }
      App.closeModal('vagaFormModal');
      load();
    } catch (err) {
      App.showStatus('vaga-form-status', 'error', 'Erro: ' + err.message);
    }
  }

  function remove(uuid) {
    const vaga = allVagas.find(v => v.uuid === uuid);
    App.confirm(
      'Excluir vaga',
      `"${vaga?.cargo} — ${vaga?.empresa}" será excluída permanentemente.`,
      async () => {
        await DB.deleteVaga(uuid);
        App.closeModal('vagaDetailModal');
        load();
      }
    );
  }

  function removeResume() {
    if (!activeVaga) return;
    App.confirm(
      'Excluir currículo',
      'O currículo gerado para esta vaga será removido. A vaga permanece.',
      async () => {
        await DB.deleteCurriculo(activeVaga.uuid);
        App.closeModal('vagaDetailModal');
        load();
      }
    );
  }

  // ── Generation flow (GROQ or manual) ─────────────────────────────────────
  async function startGeneration() {
    if (!activeVaga) return;

    try {
      const [history, masterResp] = await Promise.all([
        DB.buildHistoryMarkdown(),
        fetch('/core/prompts/master-prompt.md'),
      ]);

      if (!history?.trim()) throw new Error('Histórico profissional vazio. Adicione experiências primeiro.');
      if (!masterResp.ok)   throw new Error('master-prompt.md não encontrado.');

      let prompt = await masterResp.text();
      prompt = prompt
        .replace('{{PROFESSIONAL_HISTORY}}', history)
        .replace('{{JOB_DESCRIPTION}}', activeVaga.descricao);

      // Try GROQ first
      App.closeModal('vagaDetailModal');
      showGroqProgress('Iniciando geração automática...');

      const result = await GROQ.generate(prompt, (msg) => {
        updateGroqProgress(msg);
      });

      hideGroqProgress();

      if (result.ok) {
        // Auto-save the result
        await finalizeGeneration(result.data);
      } else if (result.fallback) {
        // Show fallback notice and go to manual flow
        if (result.reason) {
          showFallbackNotice(result.reason);
        }
        document.getElementById('promptContent').textContent = prompt;
        App.openModal('promptModal');
      }
    } catch (err) {
      hideGroqProgress();
      alert('Erro ao gerar prompt: ' + err.message);
    }
  }

  function showGroqProgress(msg) {
    const el = document.getElementById('groqProgressModal');
    if (el) {
      el.classList.add('open');
      updateGroqProgress(msg);
    }
  }

  function updateGroqProgress(msg) {
    const el = document.getElementById('groqProgressMsg');
    if (el) el.textContent = msg;
  }

  function hideGroqProgress() {
    const el = document.getElementById('groqProgressModal');
    if (el) el.classList.remove('open');
  }

  function showFallbackNotice(reason) {
    const el = document.getElementById('fallbackNotice');
    if (el) {
      el.textContent = `ℹ️ ${reason}. Use o fluxo manual abaixo.`;
      el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 8000);
    }
  }

  async function finalizeGeneration(data) {
    if (!activeVaga) return;

    if (!data.elegibilidade || !data.curriculo) {
      throw new Error('JSON inválido: faltam campos obrigatórios');
    }

    await DB.saveCurriculo(activeVaga.uuid, data);
    activeCurr = data;
    await DB.updateVaga(activeVaga.uuid, { _eligibility: data.elegibilidade });
    allVagas = await DB.listVagas();

    document.getElementById('result_eligibility').innerHTML = renderEligibilityFull(data.elegibilidade);
    App.openModal('resultModal');
    load();
  }

  // ── Prompt / Manual flow ──────────────────────────────────────────────────
  function copyPrompt() {
    const text = document.getElementById('promptContent').textContent;
    navigator.clipboard.writeText(text).then(() => {
      const btn  = document.getElementById('copyPromptBtn');
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Copiado!';
      setTimeout(() => btn.innerHTML = orig, 2000);
    });
  }

  function advanceToJson() {
    document.getElementById('jsonInput').value = '';
    document.getElementById('json-modal-status').classList.remove('show');
    document.getElementById('jsonModalTitle').textContent = 'Colar Resposta do ChatGPT';
    App.closeModal('promptModal');
    App.openModal('jsonModal');
  }

  function backToPrompt() {
    App.closeModal('jsonModal');
    App.openModal('promptModal');
  }

  async function saveJson() {
    const text = document.getElementById('jsonInput').value.trim();
    if (!text) {
      App.showStatus('json-modal-status', 'error', 'Cole o JSON do ChatGPT!');
      return;
    }

    try {
      const data = JSON.parse(text);
      await finalizeGeneration(data);
      App.closeModal('jsonModal');
    } catch (err) {
      App.showStatus('json-modal-status', 'error', '❌ ' + err.message);
    }
  }

  // ── Suggest Change ────────────────────────────────────────────────────────
  async function openSuggestChange() {
    if (!activeCurr) return;
    document.getElementById('suggestChangeInput').value = '';
    document.getElementById('suggest-modal-status').classList.remove('show');
    document.getElementById('suggestChangeJson').value = JSON.stringify(activeCurr, null, 2);
    App.closeModal('vagaDetailModal');
    App.openModal('suggestChangeModal');

    // Check if GROQ is available (key + enabled)
    const cfg = await DB.getSettings();
    const hasGroq = !!(cfg.groq_key && cfg.groq_key.startsWith('gsk_') && cfg.groq_enabled !== false);
    const modeEl = document.getElementById('suggest-mode-indicator');
    if (modeEl) {
      modeEl.innerHTML = hasGroq
        ? `<span style="background:var(--success-light);color:#065f46;padding:3px 8px;border-radius:99px;font-size:12px;font-weight:600;">⚡ GROQ — alteração automática</span>`
        : `<span style="background:var(--warning-light);color:#78350f;padding:3px 8px;border-radius:99px;font-size:12px;font-weight:600;">📋 Manual — copiar prompt</span>`;
    }
  }

  async function applySuggestChange() {
    const request = document.getElementById('suggestChangeInput').value.trim();
    if (!request) {
      App.showStatus('suggest-modal-status', 'error', 'Descreva o que deseja alterar!');
      return;
    }

    const btn = document.getElementById('btn-apply-suggest');
    if (btn) { btn.disabled = true; btn.textContent = 'Aplicando…'; }

    try {
      const changePromptResp = await fetch('/core/prompts/change-prompt.md');
      if (!changePromptResp.ok) throw new Error('change-prompt.md não encontrado');
      const changePrompt = await changePromptResp.text();

      const result = await GROQ.suggestChange(activeCurr, request, changePrompt, (msg) => {
        App.showStatus('suggest-modal-status', 'success', msg);
      });

      if (result.ok) {
        // Validate and save
        if (!result.data.elegibilidade || !result.data.curriculo) {
          throw new Error('JSON retornado inválido — estrutura corrompida');
        }
        await finalizeFromSuggest(result.data);
        App.closeModal('suggestChangeModal');
      } else if (result.fallback) {
        // Show manual change prompt
        const fullPrompt = changePrompt
          .replace('{{CURRENT_JSON}}', JSON.stringify(activeCurr, null, 2))
          .replace('{{USER_REQUEST}}', request);
        document.getElementById('suggestChangeJson').value = fullPrompt;
        document.getElementById('suggest-manual-section').style.display = 'block';
        App.showStatus('suggest-modal-status', 'error', result.reason + '. Use o fluxo manual abaixo.');
      }
    } catch (err) {
      App.showStatus('suggest-modal-status', 'error', '❌ ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Aplicar Alteração'; }
    }
  }

  function copySuggestPrompt() {
    const text = document.getElementById('suggestChangeJson').value;
    navigator.clipboard.writeText(text).then(() => {
      const btn  = document.getElementById('btn-copy-suggest');
      const orig = btn.textContent;
      btn.textContent = '✓ Copiado!';
      setTimeout(() => btn.textContent = orig, 2000);
    });
  }

  async function saveSuggestJson() {
    const text = document.getElementById('suggestJsonResult').value.trim();
    if (!text) {
      App.showStatus('suggest-modal-status', 'error', 'Cole o JSON retornado!');
      return;
    }
    try {
      const data = JSON.parse(text);
      await finalizeFromSuggest(data);
      App.closeModal('suggestChangeModal');
    } catch (err) {
      App.showStatus('suggest-modal-status', 'error', '❌ ' + err.message);
    }
  }

  async function finalizeFromSuggest(data) {
    await DB.saveCurriculo(activeVaga.uuid, data);
    activeCurr = data;
    if (data.elegibilidade) {
      await DB.updateVaga(activeVaga.uuid, { _eligibility: data.elegibilidade });
      allVagas = await DB.listVagas();
    }
    load();
    App.showStatus('suggest-modal-status', 'success', '✓ Currículo atualizado com sucesso!');
  }

  // ── View Resume ───────────────────────────────────────────────────────────
  async function viewResume() {
    if (!activeCurr) return;

    const personal    = (await DB.getPersonal()) || {};
    const resumeData  = { ...activeCurr.curriculo, vaga_alvo: activeCurr.vaga_alvo, personalData: personal };
    const titulo      = buildTitle(activeCurr, personal);
    resumeData._titulo = titulo;

    sessionStorage.setItem('current_resume', JSON.stringify(resumeData));
    sessionStorage.setItem('resume_titulo', titulo);

    const iframe = document.getElementById('resumeIframe');
    iframe.src = '';
    setTimeout(() => { iframe.src = 'resume.html'; }, 50);
    document.getElementById('vizTitle').textContent = titulo.replace(/_/g, ' ');

    App.closeModal('vagaDetailModal');
    App.closeModal('resultModal');
    App.openModal('vizModal');
  }

  function buildTitle(curr, personal) {
    const clean = str => (str || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_');
    const parts = (personal?.name || '').trim().split(/\s+/);
    const name  = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0] || '';
    const emp   = curr?.vaga_alvo?.empresa || '';
    const cargo = curr?.curriculo?.titulo_curriculo || curr?.curriculo?.header?.headline || '';
    return ['cv', clean(name), clean(emp), clean(cargo)].filter(Boolean).join('_');
  }

  function printResume() {
    document.getElementById('resumeIframe')?.contentWindow?.print();
  }

  // ── Eligibility full render ───────────────────────────────────────────────
  function renderEligibilityFull(eli) {
    const stars = eli.pontuacao_estrelas || 0;
    const cls   = getEliClass(eli.status);
    return `
      <div class="eligibility-score-card">
        <div class="stars-display">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>
        <div class="eligibility-status ${cls}">${App.esc(eli.status)}</div>
        ${eli.pontuacao_percentual ? `<div class="eligibility-percent">${eli.pontuacao_percentual}% de compatibilidade</div>` : ''}
      </div>
      ${eli.pontos_fortes?.length ? `
        <div class="eligibility-section">
          <h4>Pontos Fortes</h4>
          <ul class="eligibility-list strengths">${eli.pontos_fortes.map(p => `<li>${App.esc(p)}</li>`).join('')}</ul>
        </div>` : ''}
      ${eli.pontos_fracos?.length ? `
        <div class="eligibility-section">
          <h4>Pontos de Atenção</h4>
          <ul class="eligibility-list weaknesses">${eli.pontos_fracos.map(p => `<li>${App.esc(p)}</li>`).join('')}</ul>
        </div>` : ''}
      ${eli.sugestoes?.length ? `
        <div class="eligibility-section">
          <h4>Sugestões</h4>
          <ul class="eligibility-list suggestions">${eli.sugestoes.map(p => `<li>${App.esc(p)}</li>`).join('')}</ul>
        </div>` : ''}
      <div class="recommendation-box">
        <strong>Recomendação:</strong> ${App.esc(eli.recomendacao)}
      </div>`;
  }

  // ── URL Extractor ─────────────────────────────────────────────────────────
  async function extractUrl() {
    const url = gv('v_url');
    const btn = document.getElementById('extractBtn');
    if (!url) { App.showStatus('extract-status', 'error', 'Cole uma URL válida.'); return; }

    try {
      App.showStatus('extract-status', 'success', '⏳ Extraindo…');
      btn.disabled = true; btn.textContent = 'Extraindo…';

      const res  = await fetch('https://linkedin-job-extractor-backend.onrender.com/api/extrair-vaga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error('Erro ao acessar servidor');
      const data = await res.json();
      if (!data.sucesso) throw new Error(data.erro || 'Erro ao extrair');

      setVals({ v_cargo: data.titulo || '', v_empresa: data.empresa || '', v_descricao: data.descricao || '' });
      App.showStatus('extract-status', 'success', '✓ Vaga extraída!');
    } catch (err) {
      App.showStatus('extract-status', 'error', '❌ ' + err.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Extrair';
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getEliClass(status = '') {
    if (status.includes('ELEGÍVEL') && !status.includes('NÃO') && !status.includes('BAIXA')) return 'status-eligible';
    if (status.includes('PARCIAL') || status.includes('BAIXA')) return 'status-partial';
    return 'status-not-eligible';
  }

  function formatStatus(s) {
    const map = {
      criada: 'Criada', aplicada: 'Aplicada', entrevista: 'Entrevista',
      rejeitada: 'Rejeitada', desisti: 'Desisti', nao_passei: 'Não Passei'
    };
    return map[s] || s;
  }

  function gv(id)     { return document.getElementById(id)?.value?.trim() || ''; }
  function setVals(o) { Object.entries(o).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v || ''; }); }

  return {
    load, applyFilters, goPage,
    openNew, openEdit, saveVaga, remove, removeResume,
    openDetail, startGeneration, copyPrompt, advanceToJson, backToPrompt, saveJson,
    openSuggestChange, applySuggestChange, copySuggestPrompt, saveSuggestJson,
    viewResume, printResume, extractUrl,
  };
})();