// vagas.js — Gerenciamento de vagas e currículos
// Usa IndexedDB (DB global) em vez de fetch ao server.py

let todasVagas      = [];
let vagasFiltradas  = [];
let paginaAtual     = 1;
const vagasPorPagina = 10;
let vagaAtualUUID   = null;
let curriculoAtual  = null;

document.addEventListener('DOMContentLoaded', () => carregarVagas());

// ── Vagas ─────────────────────────────────────────────────────────────────────

async function carregarVagas() {
  try {
    todasVagas = await DB.listVagas();
    await filterVagas();
  } catch (err) {
    console.error('Erro ao carregar vagas:', err);
  }
}

async function filterVagas() {
  const statusFilter = document.getElementById('statusFilter').value;
  vagasFiltradas = statusFilter === 'all'
    ? [...todasVagas]
    : todasVagas.filter(v => v.status === statusFilter);
  paginaAtual = 1;
  await renderizarVagas();
}

async function renderizarVagas() {
  const startIndex   = (paginaAtual - 1) * vagasPorPagina;
  const vagasPagina  = vagasFiltradas.slice(startIndex, startIndex + vagasPorPagina);
  const container    = document.getElementById('vagasList');

  if (vagasFiltradas.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--text-secondary);">
        <p style="font-size:32px;margin-bottom:12px;">📭</p>
        <p style="font-weight:600;margin-bottom:8px;">Nenhuma vaga encontrada.</p>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="openNovaVagaModal()">➕ Criar Primeira Vaga</button>
      </div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  // Checar existência de currículos em paralelo
  const checks = await Promise.all(vagasPagina.map(v => DB.existsCurriculo(v.uuid)));

  container.innerHTML = vagasPagina.map((vaga, i) => {
    const temCurriculo = checks[i];
    return `
    <div class="vaga-card">
      <div class="vaga-header">
        <div>
          <div class="vaga-title">${esc(vaga.cargo)}</div>
          <div class="vaga-empresa">${esc(vaga.empresa)}</div>
        </div>
        <div class="vaga-status status-${vaga.status}">${formatarStatus(vaga.status)}</div>
      </div>
      <div class="vaga-meta">
        <span>📅 Cadastrada em ${formatarData(vaga.data_cadastro)}</span>
        <span>🔄 Atualizada em ${formatarData(vaga.data_atualizacao)}</span>
      </div>
      <div class="vaga-descricao">${esc(vaga.descricao.substring(0, 200))}…</div>
      <div class="vaga-actions">
        ${temCurriculo ? `
          <button class="btn btn-success btn-small" onclick="visualizarCurriculo('${vaga.uuid}')">👁️ Ver Currículo</button>
          <button class="btn btn-primary btn-small" onclick="editarJsonCurriculo('${vaga.uuid}')">✏️ Editar JSON</button>
          <button class="btn btn-danger btn-small" onclick="excluirCurriculo('${vaga.uuid}')">🗑️ Excluir Currículo</button>
        ` : `
          <button class="btn btn-primary btn-small" onclick="gerarPromptVaga('${vaga.uuid}')">🚀 Gerar Currículo</button>
        `}
        <button class="btn btn-secondary btn-small" onclick="editarVaga('${vaga.uuid}')">✏️ Editar</button>
        <button class="btn btn-secondary btn-small" onclick="verDescricao('${vaga.uuid}')">📄 Descrição</button>
        <button class="btn btn-danger btn-small" onclick="excluirVaga('${vaga.uuid}')">🗑️ Excluir</button>
      </div>
    </div>`;
  }).join('');

  renderizarPaginacao();
}

function renderizarPaginacao() {
  const totalPaginas = Math.ceil(vagasFiltradas.length / vagasPorPagina);
  const container    = document.getElementById('pagination');
  if (totalPaginas <= 1) { container.innerHTML = ''; return; }

  let html = `<button class="page-btn" ${paginaAtual===1 ? 'disabled':''} onclick="mudarPagina(${paginaAtual-1})">←</button>`;
  for (let i = 1; i <= totalPaginas; i++) {
    html += `<button class="page-btn ${paginaAtual===i?'active':''}" onclick="mudarPagina(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" ${paginaAtual===totalPaginas?'disabled':''} onclick="mudarPagina(${paginaAtual+1})">→</button>`;
  container.innerHTML = html;
}

async function mudarPagina(pagina) { paginaAtual = pagina; await renderizarVagas(); }

function formatarStatus(s) {
  const map = { criada:'Criada', aplicada:'Aplicada', entrevista:'Em Entrevista', rejeitada:'Rejeitada', desisti:'Desisti', nao_passei:'Não Passei' };
  return map[s] || s;
}

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Modais de Vaga ────────────────────────────────────────────────────────────

function openNovaVagaModal() {
  document.getElementById('novaVagaModal').style.display = 'flex';
  ['modal_empresa','modal_cargo','modal_descricao','modal_url_vaga'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const statusEl = document.getElementById('statusExtracao');
  if (statusEl) statusEl.style.display = 'none';
}
function closeNovaVagaModal() { document.getElementById('novaVagaModal').style.display = 'none'; }

async function salvarNovaVaga() {
  const empresa   = document.getElementById('modal_empresa').value.trim();
  const cargo     = document.getElementById('modal_cargo').value.trim();
  const descricao = document.getElementById('modal_descricao').value.trim();
  if (!empresa || !cargo || !descricao) {
    showModalStatus('modalStatus','error','Todos os campos são obrigatórios!'); return;
  }
  try {
    await DB.createVaga({ empresa, cargo, descricao });
    showModalStatus('modalStatus','success','✅ Vaga criada com sucesso!');
    setTimeout(() => { closeNovaVagaModal(); carregarVagas(); }, 900);
  } catch (err) {
    showModalStatus('modalStatus','error','❌ Erro ao criar vaga: ' + err.message);
  }
}

function editarVaga(uuid) {
  const vaga = todasVagas.find(v => v.uuid === uuid);
  if (!vaga) return;
  document.getElementById('edit_uuid').value      = vaga.uuid;
  document.getElementById('edit_empresa').value   = vaga.empresa;
  document.getElementById('edit_cargo').value     = vaga.cargo;
  document.getElementById('edit_descricao').value = vaga.descricao;
  document.getElementById('edit_status').value    = vaga.status;
  document.getElementById('editVagaModal').style.display = 'flex';
}
function closeEditVagaModal() { document.getElementById('editVagaModal').style.display = 'none'; }

async function salvarEdicaoVaga() {
  const uuid      = document.getElementById('edit_uuid').value;
  const empresa   = document.getElementById('edit_empresa').value.trim();
  const cargo     = document.getElementById('edit_cargo').value.trim();
  const descricao = document.getElementById('edit_descricao').value.trim();
  const status    = document.getElementById('edit_status').value;
  if (!empresa || !cargo || !descricao) {
    showModalStatus('editModalStatus','error','Todos os campos são obrigatórios!'); return;
  }
  try {
    await DB.updateVaga(uuid, { empresa, cargo, descricao, status });
    showModalStatus('editModalStatus','success','✅ Vaga atualizada!');
    setTimeout(() => { closeEditVagaModal(); carregarVagas(); }, 900);
  } catch (err) {
    showModalStatus('editModalStatus','error','❌ Erro: ' + err.message);
  }
}

function verDescricao(uuid) {
  const vaga = todasVagas.find(v => v.uuid === uuid);
  if (!vaga) return;
  document.getElementById('descricaoTexto').textContent = vaga.descricao;
  document.getElementById('descricaoTitulo').textContent = `${vaga.cargo} — ${vaga.empresa}`;
  document.getElementById('descricaoModal').style.display = 'flex';
}
function closeDescricaoModal() { document.getElementById('descricaoModal').style.display = 'none'; }

async function excluirVaga(uuid) {
  const vaga = todasVagas.find(v => v.uuid === uuid);
  if (!vaga) return;
  abrirConfirmacao(
    `Excluir vaga: ${vaga.cargo} — ${vaga.empresa}`,
    'Esta ação não pode ser desfeita. O currículo gerado também será excluído.',
    async () => {
      await DB.deleteVaga(uuid);
      await carregarVagas();
    }
  );
}

async function excluirCurriculo(uuid) {
  const vaga = todasVagas.find(v => v.uuid === uuid);
  abrirConfirmacao(
    'Excluir currículo gerado',
    `O currículo de "${vaga?.cargo || 'esta vaga'}" será removido.`,
    async () => {
      await DB.deleteCurriculo(uuid);
      await carregarVagas();
    }
  );
}

// ── Modal de Confirmação ──────────────────────────────────────────────────────

function abrirConfirmacao(titulo, mensagem, callback) {
  document.getElementById('confirmTitulo').textContent  = titulo;
  document.getElementById('confirmMensagem').textContent = mensagem;
  document.getElementById('confirmModal').style.display = 'flex';
  document.getElementById('confirmBtn').onclick = async () => {
    closeConfirmModal();
    await callback();
  };
}
function closeConfirmModal() { document.getElementById('confirmModal').style.display = 'none'; }

function showModalStatus(elementId, type, message) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = message;
  el.className = 'status'; // reset

  if (type === 'success') {
    el.classList.add('status-success');
  } else if (type === 'error') {
    el.classList.add('status-error');
  }

  el.style.display = 'block';
}


// ── Extrator de URL (agora client-side apenas como informação) ────────────────
// Sem backend disponível na PWA — orientar colar manualmente

async function extrairVagaUrl() {
  const url = document.getElementById('modal_url_vaga').value.trim();
  const btn = document.getElementById('btnExtrair');

  if (!url) {
    showModalStatus('statusExtracao', 'error', 'Cole uma URL válida.');
    return;
  }

  try {
    showModalStatus(
      'statusExtracao',
      'success',
      '⏳ Servidor iniciando, pode levar alguns segundos...'
    );

    btn.disabled = true;
    btn.textContent = 'Extraindo...';

    const response = await fetch(
      'https://linkedin-job-extractor-backend.onrender.com/api/extrair-vaga',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      }
    );

    if (!response.ok) throw new Error('Erro ao acessar servidor');

    const data = await response.json();

    if (!data.sucesso) {
      throw new Error(data.erro || 'Erro ao extrair vaga');
    }

    document.getElementById('modal_cargo').value     = data.titulo || '';
    document.getElementById('modal_empresa').value   = data.empresa || '';
    document.getElementById('modal_descricao').value = data.descricao || '';

    showModalStatus('statusExtracao', 'success', '✅ Vaga extraída com sucesso!');

  } catch (err) {
    showModalStatus('statusExtracao', 'error', '❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Extrair';
  }
}



// ── Geração de Prompt ─────────────────────────────────────────────────────────

async function gerarPromptVaga(uuid) {
  vagaAtualUUID = uuid;
  const vaga = todasVagas.find(v => v.uuid === uuid);
  if (!vaga) return;

  try {
    const [history, masterPromptRes] = await Promise.all([
      DB.getHistory(),
      fetch('/core/prompts/master-prompt.md'),
    ]);

    if (!history?.trim()) throw new Error('Histórico profissional vazio. Salve seus dados primeiro.');
    if (!masterPromptRes.ok) throw new Error('Arquivo master-prompt.md não encontrado.');

    let masterPrompt = await masterPromptRes.text();
    masterPrompt = masterPrompt
      .replace('{{PROFESSIONAL_HISTORY}}', history)
      .replace('{{JOB_DESCRIPTION}}', vaga.descricao);

    document.getElementById('generatedPrompt').textContent = masterPrompt;
    document.getElementById('promptModal').style.display = 'flex';
  } catch (err) {
    alert('Erro ao gerar prompt: ' + err.message);
  }
}

function closePromptModal() { document.getElementById('promptModal').style.display = 'none'; }

function copyPrompt() {
  const prompt = document.getElementById('generatedPrompt').textContent;
  navigator.clipboard.writeText(prompt).then(() => {
    const btn = document.querySelector('[onclick="copyPrompt()"]');
    const orig = btn.textContent;
    btn.textContent = '✅ Copiado!';
    setTimeout(() => btn.textContent = orig, 2000);
  });
}

function avancarParaColarResposta() {
  closePromptModal();
  document.getElementById('resposta_vaga_uuid').value = vagaAtualUUID;
  document.getElementById('jsonResposta').value = '';
  resetarModalResposta();
  document.getElementById('respostaModal').style.display = 'flex';
}
function closeRespostaModal() { document.getElementById('respostaModal').style.display = 'none'; }
function voltarParaPrompt() { closeRespostaModal(); document.getElementById('promptModal').style.display = 'flex'; }

// ── Editar JSON do Currículo ──────────────────────────────────────────────────

async function editarJsonCurriculo(uuid) {
  vagaAtualUUID = uuid;
  const jsonData = await DB.getCurriculo(uuid);
  if (!jsonData) { alert('Não foi possível carregar o JSON do currículo.'); return; }
  document.getElementById('resposta_vaga_uuid').value = uuid;
  document.getElementById('jsonResposta').value = JSON.stringify(jsonData, null, 2);
  document.getElementById('respostaModalTitulo').textContent   = '✏️ Editar JSON do Currículo';
  document.getElementById('respostaModalDescricao').textContent = 'Edite o JSON abaixo e clique em "Salvar Currículo":';
  document.getElementById('btnGerarCurriculo').textContent     = '💾 Salvar Currículo';
  document.getElementById('btnVoltarPrompt').style.display     = 'none';
  document.getElementById('respostaModal').style.display = 'flex';
}

// ── Geração / Salvamento ──────────────────────────────────────────────────────

async function gerarCurriculo() {
  const vagaUUID = document.getElementById('resposta_vaga_uuid').value;
  const jsonText = document.getElementById('jsonResposta').value.trim();
  if (!jsonText) {
    showModalStatus('respostaStatus','error','Cole o JSON retornado pelo ChatGPT!'); return;
  }
  try {
    const jsonData = JSON.parse(jsonText);
    if (!jsonData.elegibilidade || !jsonData.curriculo) throw new Error('JSON inválido: faltam campos obrigatórios');
    await DB.saveCurriculo(vagaUUID, jsonData);
    curriculoAtual = jsonData;
    vagaAtualUUID  = vagaUUID;
    resetarModalResposta();
    closeRespostaModal();
    mostrarCurriculoGerado();
    await carregarVagas();
  } catch (err) {
    showModalStatus('respostaStatus','error','❌ ' + err.message);
  }
}

function resetarModalResposta() {
  document.getElementById('respostaModalTitulo').textContent   = 'Colar Resposta do ChatGPT';
  document.getElementById('respostaModalDescricao').textContent = 'Cole aqui o JSON completo retornado pelo ChatGPT:';
  document.getElementById('btnGerarCurriculo').textContent     = '✨ Gerar Currículo';
  document.getElementById('btnVoltarPrompt').style.display     = 'inline-flex';
}

// ── Exibição do Currículo ─────────────────────────────────────────────────────

function mostrarCurriculoGerado() {
  if (!curriculoAtual) return;
  const el = curriculoAtual.elegibilidade;
  const html = `
    <div class="eligibility-card">
      <div class="eligibility-score">
        <div class="stars">${'⭐'.repeat(el.pontuacao_estrelas)}</div>
        <div class="score-status ${getEligibilityClass(el.status)}">${el.status}</div>
        ${el.pontuacao_percentual ? `<div style="margin-top:6px;color:#6b7280;">${el.pontuacao_percentual}% de compatibilidade</div>` : ''}
      </div>
      <div style="margin-bottom:20px;">
        <h4 style="margin-bottom:12px;">✅ Pontos Fortes:</h4>
        <ul class="points-list strengths">${el.pontos_fortes.map(p=>`<li>${p}</li>`).join('')}</ul>
      </div>
      ${el.pontos_fracos?.length ? `
        <div style="margin-bottom:20px;">
          <h4 style="margin-bottom:12px;">⚠️ Pontos Fracos:</h4>
          <ul class="points-list weaknesses">${el.pontos_fracos.map(p=>`<li>${p}</li>`).join('')}</ul>
        </div>` : ''}
      ${el.sugestoes?.length ? `
        <div>
          <h4 style="margin-bottom:12px;">💡 Sugestões:</h4>
          <ul class="points-list suggestions">${el.sugestoes.map(p=>`<li>${p}</li>`).join('')}</ul>
        </div>` : ''}
      <div style="margin-top:20px;padding:16px;background:white;border-radius:8px;">
        <strong>Recomendação:</strong> ${el.recomendacao}
      </div>
    </div>`;
  document.getElementById('eligibilityContent').innerHTML = html;
  document.getElementById('curriculoModal').style.display = 'flex';
}

function getEligibilityClass(status) {
  if (status.includes('ELEGÍVEL') && !status.includes('NÃO') && !status.includes('BAIXA')) return 'eligible';
  if (status.includes('PARCIAL') || status.includes('BAIXA')) return 'partial';
  return 'not-eligible';
}

async function visualizarCurriculo(uuid) {
  const jsonData = await DB.getCurriculo(uuid);
  if (!jsonData) { alert('Currículo não encontrado'); return; }
  curriculoAtual = jsonData;
  vagaAtualUUID  = uuid;
  mostrarCurriculoGerado();
}

function closeCurriculoModal() { document.getElementById('curriculoModal').style.display = 'none'; }

// ── Visualizador (iframe) ─────────────────────────────────────────────────────

async function abrirVisualizacaoCurriculo() {
  if (!curriculoAtual) return;
  const personalData = (await DB.getPersonal()) || {};

  const resumeData = { ...curriculoAtual.curriculo, vaga_alvo: curriculoAtual.vaga_alvo, personalData };
  const titulo = gerarTituloCurriculo(curriculoAtual, personalData);
  resumeData._titulo = titulo;

  sessionStorage.setItem('current_resume', JSON.stringify(resumeData));
  sessionStorage.setItem('resume_titulo', titulo);

  const iframe = document.getElementById('resumeIframe');
  iframe.src = '';
  setTimeout(() => { iframe.src = 'resume.html'; }, 50);
  document.getElementById('visualizadorTitulo').textContent = titulo.replace(/_/g, ' ');
  document.getElementById('visualizadorModal').style.display = 'flex';
}

function gerarTituloCurriculo(curriculo, personalData) {
  const limpar = str => (str||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,'').trim().replace(/\s+/g,'_');
  const nomeCompleto = personalData?.name || '';
  const partes = nomeCompleto.trim().split(/\s+/);
  const nome = partes.length >= 2 ? `${partes[0]} ${partes[partes.length-1]}` : partes[0] || '';
  const empresa = curriculo?.vaga_alvo?.empresa || '';
  const cargo   = curriculo?.curriculo?.titulo_curriculo || curriculo?.curriculo?.header?.headline || '';
  return ['cv', limpar(nome), limpar(empresa), limpar(cargo)].filter(Boolean).join('_');
}

function closeVisualizadorModal() {
  document.getElementById('visualizadorModal').style.display = 'none';
  document.getElementById('resumeIframe').src = '';
}

function imprimirDoVisualizador() {
  const iframe = document.getElementById('resumeIframe');
  if (iframe.contentWindow) iframe.contentWindow.print();
}

function downloadJsonCurriculo() {
  if (!curriculoAtual) return;
  const blob = new Blob([JSON.stringify(curriculoAtual, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const vaga = todasVagas.find(v => v.uuid === vagaAtualUUID);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `curriculo_${vaga ? vaga.empresa.replace(/\s+/g,'_') : 'vaga'}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function showModalStatus(elementId, type, msg) {
  const s = document.getElementById(elementId);
  if (!s) return;
  s.className = `status ${type}`;
  s.textContent = msg;
  s.style.display = 'block';
  setTimeout(() => { s.style.display = 'none'; }, 6000);
}
