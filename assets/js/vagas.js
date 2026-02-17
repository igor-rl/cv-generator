// Variáveis globais
let todasVagas = [];
let vagasFiltradas = [];
let paginaAtual = 1;
const vagasPorPagina = 10;
let vagaAtualUUID = null;
let curriculoAtual = null;

// Carregar vagas ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    carregarVagas();
});

// =============== GERENCIAMENTO DE VAGAS ===============

async function carregarVagas() {
    try {
        const res = await fetch('/api/vagas');
        todasVagas = await res.json();
        todasVagas.sort((a, b) => new Date(b.data_cadastro) - new Date(a.data_cadastro));
        filterVagas();
    } catch (err) {
        console.error('Erro ao carregar vagas:', err);
    }
}

function filterVagas() {
    const statusFilter = document.getElementById('statusFilter').value;
    vagasFiltradas = statusFilter === 'all' ? [...todasVagas] : todasVagas.filter(v => v.status === statusFilter);
    paginaAtual = 1;
    renderizarVagas();
}

function renderizarVagas() {
    const startIndex = (paginaAtual - 1) * vagasPorPagina;
    const vagasPagina = vagasFiltradas.slice(startIndex, startIndex + vagasPorPagina);
    const container = document.getElementById('vagasList');

    if (vagasFiltradas.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <p>Nenhuma vaga encontrada.</p>
                <button class="btn btn-primary" style="margin-top: 16px;" onclick="openNovaVagaModal()">➕ Criar Primeira Vaga</button>
            </div>`;
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    container.innerHTML = vagasPagina.map(vaga => {
        const temCurriculo = existeCurriculo(vaga.uuid);
        return `
        <div class="vaga-card">
            <div class="vaga-header">
                <div>
                    <div class="vaga-title">${vaga.cargo}</div>
                    <div class="vaga-empresa">${vaga.empresa}</div>
                </div>
                <div class="vaga-status status-${vaga.status}">${formatarStatus(vaga.status)}</div>
            </div>
            <div class="vaga-meta">
                <span>📅 Cadastrada em ${formatarData(vaga.data_cadastro)}</span>
                <span>🔄 Atualizada em ${formatarData(vaga.data_atualizacao)}</span>
            </div>
            <div class="vaga-descricao">${vaga.descricao.substring(0, 200)}...</div>
            <div class="vaga-actions">
                ${temCurriculo ? `
                    <button class="btn btn-success btn-small" onclick="visualizarCurriculo('${vaga.uuid}')">
                        👁️ Ver Currículo
                    </button>
                    <button class="btn btn-primary btn-small" onclick="editarJsonCurriculo('${vaga.uuid}')">
                        ✏️ Editar JSON
                    </button>
                    <button class="btn btn-danger btn-small" onclick="excluirCurriculo('${vaga.uuid}')">
                        🗑️ Excluir Currículo
                    </button>
                ` : `
                    <button class="btn btn-primary btn-small" onclick="gerarPromptVaga('${vaga.uuid}')">
                        🚀 Gerar Currículo
                    </button>
                `}
                <button class="btn btn-secondary btn-small" onclick="editarVaga('${vaga.uuid}')">✏️ Editar Vaga</button>
                <button class="btn btn-secondary btn-small" onclick="verDescricao('${vaga.uuid}')">📄 Ver Descrição</button>
                <button class="btn btn-danger btn-small" onclick="excluirVaga('${vaga.uuid}')">🗑️ Excluir Vaga</button>
            </div>
        </div>`;
    }).join('');

    renderizarPaginacao();
}

function renderizarPaginacao() {
    const totalPaginas = Math.ceil(vagasFiltradas.length / vagasPorPagina);
    const container = document.getElementById('pagination');
    if (totalPaginas <= 1) { container.innerHTML = ''; return; }

    let html = `<button class="page-btn" ${paginaAtual === 1 ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual - 1})">←</button>`;
    for (let i = 1; i <= totalPaginas; i++) {
        html += `<button class="page-btn ${paginaAtual === i ? 'active' : ''}" onclick="mudarPagina(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" ${paginaAtual === totalPaginas ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual + 1})">→</button>`;
    container.innerHTML = html;
}

function mudarPagina(pagina) { paginaAtual = pagina; renderizarVagas(); }

function formatarStatus(status) {
    const map = { 'criada': 'Criada', 'aplicada': 'Aplicada', 'entrevista': 'Em Entrevista', 'rejeitada': 'Rejeitada', 'desisti': 'Desisti', 'nao_passei': 'Não Passei' };
    return map[status] || status;
}

function formatarData(isoDate) {
    return new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function existeCurriculo(vagaUUID) {
    return localStorage.getItem(`curriculo_${vagaUUID}`) !== null;
}

// =============== MODAIS DE VAGA ===============

function openNovaVagaModal() {
    document.getElementById('novaVagaModal').style.display = 'flex';
    document.getElementById('modal_empresa').value = '';
    document.getElementById('modal_cargo').value = '';
    document.getElementById('modal_descricao').value = '';
}

function closeNovaVagaModal() { document.getElementById('novaVagaModal').style.display = 'none'; }

async function salvarNovaVaga() {
    const empresa = document.getElementById('modal_empresa').value.trim();
    const cargo = document.getElementById('modal_cargo').value.trim();
    const descricao = document.getElementById('modal_descricao').value.trim();

    if (!empresa || !cargo || !descricao) {
        showModalStatus('modalStatus', 'error', 'Todos os campos são obrigatórios!');
        return;
    }

    try {
        const res = await fetch('/api/vagas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresa, cargo, descricao })
        });
        if (!res.ok) throw new Error('Erro ao salvar vaga');
        showModalStatus('modalStatus', 'success', '✅ Vaga criada com sucesso!');
        setTimeout(() => { closeNovaVagaModal(); carregarVagas(); }, 1000);
    } catch (err) {
        showModalStatus('modalStatus', 'error', '❌ Erro ao criar vaga');
    }
}

function editarVaga(uuid) {
    const vaga = todasVagas.find(v => v.uuid === uuid);
    if (!vaga) return;
    document.getElementById('edit_uuid').value = vaga.uuid;
    document.getElementById('edit_empresa').value = vaga.empresa;
    document.getElementById('edit_cargo').value = vaga.cargo;
    document.getElementById('edit_descricao').value = vaga.descricao;
    document.getElementById('edit_status').value = vaga.status;
    document.getElementById('editVagaModal').style.display = 'flex';
}

function closeEditVagaModal() { document.getElementById('editVagaModal').style.display = 'none'; }

async function salvarEdicaoVaga() {
    const uuid = document.getElementById('edit_uuid').value;
    const empresa = document.getElementById('edit_empresa').value.trim();
    const cargo = document.getElementById('edit_cargo').value.trim();
    const descricao = document.getElementById('edit_descricao').value.trim();
    const status = document.getElementById('edit_status').value;

    if (!empresa || !cargo || !descricao) {
        showModalStatus('editModalStatus', 'error', 'Todos os campos são obrigatórios!');
        return;
    }

    try {
        const res = await fetch(`/api/vagas/update/${uuid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresa, cargo, descricao, status })
        });
        if (!res.ok) throw new Error('Erro ao atualizar vaga');
        showModalStatus('editModalStatus', 'success', '✅ Vaga atualizada com sucesso!');
        setTimeout(() => { closeEditVagaModal(); carregarVagas(); }, 1000);
    } catch (err) {
        showModalStatus('editModalStatus', 'error', '❌ Erro ao atualizar vaga');
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

    // Usar modal de confirmação em vez de confirm()
    abrirConfirmacao(
        `Excluir vaga: ${vaga.cargo} — ${vaga.empresa}`,
        'Esta ação não pode ser desfeita. O currículo gerado para esta vaga também será excluído.',
        async () => {
            try {
                const res = await fetch(`/api/vagas/delete/${uuid}`, { method: 'POST' });
                if (!res.ok) throw new Error('Erro ao excluir vaga');
                localStorage.removeItem(`curriculo_${uuid}`);
                await carregarVagas();
            } catch (err) {
                console.error('Erro ao excluir vaga:', err);
            }
        }
    );
}

async function excluirCurriculo(uuid) {
    const vaga = todasVagas.find(v => v.uuid === uuid);
    abrirConfirmacao(
        'Excluir currículo gerado',
        `O currículo de "${vaga?.cargo || 'esta vaga'}" será removido. Você poderá gerar um novo currículo normalmente.`,
        async () => {
            try {
                await fetch(`/api/curriculo/delete/${uuid}`, { method: 'POST' });
            } catch (_) {}
            localStorage.removeItem(`curriculo_${uuid}`);
            await carregarVagas();
        }
    );
}

// =============== MODAL DE CONFIRMAÇÃO ===============

function abrirConfirmacao(titulo, mensagem, callbackConfirmar) {
    document.getElementById('confirmTitulo').textContent = titulo;
    document.getElementById('confirmMensagem').textContent = mensagem;
    document.getElementById('confirmModal').style.display = 'flex';
    document.getElementById('confirmBtn').onclick = async () => {
        closeConfirmModal();
        await callbackConfirmar();
    };
}

function closeConfirmModal() { document.getElementById('confirmModal').style.display = 'none'; }

// =============== GERAÇÃO DE PROMPT ===============

async function gerarPromptVaga(uuid) {
    vagaAtualUUID = uuid;
    const vaga = todasVagas.find(v => v.uuid === uuid);
    if (!vaga) return;

    try {
        const timestamp = new Date().getTime();
        const [
            historyRes, masterPromptRes,
            fase1Res, fase2Res, fase3Res, fase4Res, fase5Res,
            eligibilitySchemaRes, finalOutputSchemaRes
        ] = await Promise.all([
            fetch(`/data/personal-history.md?t=${timestamp}`),
            fetch(`/core/prompts/master-prompt.md?t=${timestamp}`),
            fetch(`/core/prompts/fase1.md?t=${timestamp}`),
            fetch(`/core/prompts/fase2.md?t=${timestamp}`),
            fetch(`/core/prompts/fase3.md?t=${timestamp}`),
            fetch(`/core/prompts/fase4.md?t=${timestamp}`),
            fetch(`/core/prompts/fase5.md?t=${timestamp}`),
            fetch(`/core/contracts/elegibility.schema.json?t=${timestamp}`),
            fetch(`/core/contracts/final-output.schema.json?t=${timestamp}`)
        ]);

        const history = await historyRes.text();
        let masterPrompt = await masterPromptRes.text();
        const fase1 = await fase1Res.text();
        const fase2 = await fase2Res.text();
        const fase3 = await fase3Res.text();
        const fase4 = await fase4Res.text();
        const fase5 = await fase5Res.text();
        const eligibilitySchema = await eligibilitySchemaRes.text();
        const finalOutputSchema = await finalOutputSchemaRes.text();

        masterPrompt = masterPrompt.replace('{{PROFESSIONAL_HISTORY}}', history);
        masterPrompt = masterPrompt.replace('{{JOB_DESCRIPTION}}', vaga.descricao);
        masterPrompt = masterPrompt.replace('{{FASE_1}}', fase1);
        masterPrompt = masterPrompt.replace('{{FASE_2}}', fase2);
        masterPrompt = masterPrompt.replace('{{FASE_3}}', fase3);
        masterPrompt = masterPrompt.replace('{{FASE_4}}', fase4);
        masterPrompt = masterPrompt.replace('{{FASE_5}}', fase5);
        masterPrompt = masterPrompt.replace(/{{ELEGIBILITY_SCHEMA}}/g, eligibilitySchema);
        masterPrompt = masterPrompt.replace(/{{FINAL_OUTPUT_SCHEMA}}/g, finalOutputSchema);
        masterPrompt = masterPrompt.replace(/seguindo o schema `elegibility\.schema\.json`/g,
            `seguindo este schema:\n\`\`\`json\n${eligibilitySchema}\n\`\`\``);
        masterPrompt = masterPrompt.replace(/seguindo o schema `final-output\.schema\.json`/g,
            `seguindo este schema:\n\`\`\`json\n${finalOutputSchema}\n\`\`\``);
        masterPrompt = masterPrompt.replace(/### INFORMAÇÕES PESSOAIS DO CANDIDATO:[\s\S]*?```json[\s\S]*?{{PERSONAL_DATA}}[\s\S]*?```/g, '');

        const promptFinal = `# GERAÇÃO DE CURRÍCULO ESTRATÉGICO
# Data: ${new Date().toLocaleDateString('pt-BR')}
# Vaga: ${vaga.cargo} - ${vaga.empresa}

IMPORTANTE: Este prompt contém todos os arquivos necessários já renderizados.
Não há necessidade de buscar arquivos externos.

${masterPrompt}`;

        document.getElementById('generatedPrompt').textContent = promptFinal;
        document.getElementById('promptModal').style.display = 'flex';
    } catch (err) {
        console.error('Erro ao gerar prompt:', err);
        alert('Erro ao gerar prompt: ' + err.message);
    }
}

function closePromptModal() { document.getElementById('promptModal').style.display = 'none'; }

function copyPrompt() {
    const prompt = document.getElementById('generatedPrompt').textContent;
    navigator.clipboard.writeText(prompt).then(() => {
        const btn = document.querySelector('[onclick="copyPrompt()"]');
        btn.textContent = '✅ Copiado!';
        setTimeout(() => btn.textContent = '📋 Copiar', 2000);
    });
}

function avancarParaColarResposta() {
    closePromptModal();
    document.getElementById('resposta_vaga_uuid').value = vagaAtualUUID;
    document.getElementById('jsonResposta').value = '';
    document.getElementById('respostaModal').style.display = 'flex';
}

function closeRespostaModal() { document.getElementById('respostaModal').style.display = 'none'; }

function voltarParaPrompt() {
    closeRespostaModal();
    document.getElementById('promptModal').style.display = 'flex';
}

// =============== EDITAR JSON DO CURRÍCULO ===============

async function editarJsonCurriculo(uuid) {
    vagaAtualUUID = uuid;
    let jsonData = null;

    try {
        const res = await fetch(`/api/curriculo/${uuid}`);
        if (res.ok) {
            jsonData = await res.json();
        } else {
            const stored = localStorage.getItem(`curriculo_${uuid}`);
            if (stored) jsonData = JSON.parse(stored);
        }
    } catch (_) {
        const stored = localStorage.getItem(`curriculo_${uuid}`);
        if (stored) jsonData = JSON.parse(stored);
    }

    if (!jsonData) {
        alert('Não foi possível carregar o JSON do currículo.');
        return;
    }

    document.getElementById('resposta_vaga_uuid').value = uuid;
    document.getElementById('jsonResposta').value = JSON.stringify(jsonData, null, 2);
    document.getElementById('respostaModalTitulo').textContent = '✏️ Editar JSON do Currículo';
    document.getElementById('respostaModalDescricao').textContent = 'Edite o JSON abaixo e clique em "Salvar Currículo" para aplicar as alterações:';
    document.getElementById('btnGerarCurriculo').textContent = '💾 Salvar Currículo';
    document.getElementById('btnVoltarPrompt').style.display = 'none';
    document.getElementById('respostaModal').style.display = 'flex';
}

// =============== GERAÇÃO / SALVAMENTO DE CURRÍCULO ===============

async function gerarCurriculo() {
    const vagaUUID = document.getElementById('resposta_vaga_uuid').value;
    const jsonText = document.getElementById('jsonResposta').value.trim();

    if (!jsonText) {
        showModalStatus('respostaStatus', 'error', 'Cole o JSON retornado pelo ChatGPT!');
        return;
    }

    try {
        const jsonData = JSON.parse(jsonText);
        if (!jsonData.elegibilidade || !jsonData.curriculo) throw new Error('JSON inválido: faltam campos obrigatórios');

        const res = await fetch(`/api/curriculo/${vagaUUID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData)
        });
        if (!res.ok) throw new Error('Erro ao salvar currículo');

        localStorage.setItem(`curriculo_${vagaUUID}`, JSON.stringify(jsonData));
        curriculoAtual = jsonData;
        vagaAtualUUID = vagaUUID;

        // Resetar modal de resposta para estado padrão
        resetarModalResposta();

        closeRespostaModal();
        mostrarCurriculoGerado();
        carregarVagas();

    } catch (err) {
        showModalStatus('respostaStatus', 'error', `❌ ${err.message}`);
    }
}

function resetarModalResposta() {
    document.getElementById('respostaModalTitulo').textContent = 'Colar Resposta do ChatGPT';
    document.getElementById('respostaModalDescricao').textContent = 'Cole aqui o JSON completo retornado pelo ChatGPT:';
    document.getElementById('btnGerarCurriculo').textContent = '✨ Gerar Currículo';
    document.getElementById('btnVoltarPrompt').style.display = 'inline-flex';
}

// =============== EXIBIÇÃO DO CURRÍCULO ===============

function mostrarCurriculoGerado() {
    if (!curriculoAtual) return;
    const eligibility = curriculoAtual.elegibilidade;
    const vaga = todasVagas.find(v => v.uuid === vagaAtualUUID);

    let html = `
        <div class="eligibility-card">
            <div class="eligibility-score">
                <div class="stars">${'⭐'.repeat(eligibility.pontuacao_estrelas)}</div>
                <div class="score-status ${getEligibilityClass(eligibility.status)}">${eligibility.status}</div>
                ${eligibility.pontuacao_percentual ? `<div style="margin-top:6px;color:#6b7280;">${eligibility.pontuacao_percentual}% de compatibilidade</div>` : ''}
            </div>
            <div style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 12px;">✅ Pontos Fortes:</h4>
                <ul class="points-list strengths">
                    ${eligibility.pontos_fortes.map(p => `<li>${p}</li>`).join('')}
                </ul>
            </div>
            ${eligibility.pontos_fracos?.length ? `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 12px;">⚠️ Pontos Fracos:</h4>
                    <ul class="points-list weaknesses">
                        ${eligibility.pontos_fracos.map(p => `<li>${p}</li>`).join('')}
                    </ul>
                </div>` : ''}
            ${eligibility.sugestoes?.length ? `
                <div>
                    <h4 style="margin-bottom: 12px;">💡 Sugestões:</h4>
                    <ul class="points-list suggestions">
                        ${eligibility.sugestoes.map(p => `<li>${p}</li>`).join('')}
                    </ul>
                </div>` : ''}
            <div style="margin-top: 20px; padding: 16px; background: white; border-radius: 8px;">
                <strong>Recomendação:</strong> ${eligibility.recomendacao}
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
    try {
        let jsonData = null;
        const res = await fetch(`/api/curriculo/${uuid}`);
        if (res.ok) {
            jsonData = await res.json();
        } else {
            const stored = localStorage.getItem(`curriculo_${uuid}`);
            if (stored) jsonData = JSON.parse(stored);
        }
        if (!jsonData) throw new Error('Currículo não encontrado');

        curriculoAtual = jsonData;
        vagaAtualUUID = uuid;
        mostrarCurriculoGerado();
    } catch (err) {
        console.error('Erro ao carregar currículo:', err);
        alert('Erro ao carregar currículo');
    }
}

function closeCurriculoModal() { document.getElementById('curriculoModal').style.display = 'none'; }

// =============== VISUALIZAÇÃO DO CURRÍCULO (MODAL INTERNO) ===============

async function abrirVisualizacaoCurriculo() {
    if (!curriculoAtual) return;

    const timestamp = new Date().getTime();
    let personalData = {};
    try {
        const res = await fetch(`/data/personal-data.json?t=${timestamp}`);
        if (res.ok) personalData = await res.json();
    } catch (err) {
        console.error('Erro ao carregar dados pessoais:', err);
    }

    // Montar dados completos para o visualizador
    const resumeData = {
        ...curriculoAtual.curriculo,
        vaga_alvo: curriculoAtual.vaga_alvo,
        personalData
    };

    // Gerar título formatado
    const titulo = gerarTituloCurriculo(curriculoAtual, personalData);
    resumeData._titulo = titulo;

    // Abrir modal de visualização com iframe
    const modal = document.getElementById('visualizadorModal');
    const iframe = document.getElementById('resumeIframe');

    // Salvar dados no sessionStorage para o iframe ler
    sessionStorage.setItem('current_resume', JSON.stringify(resumeData));
    sessionStorage.setItem('resume_titulo', titulo);

    // Resetar e carregar iframe
    iframe.src = '';
    setTimeout(() => {
        iframe.src = 'resume.html';
    }, 50);

    document.getElementById('visualizadorTitulo').textContent = titulo.replace(/_/g, ' ');
    modal.style.display = 'flex';
}

function gerarTituloCurriculo(curriculo, personalData) {
    // Nome: primeiro e último nome
    const nomeCompleto = personalData?.name || '';
    const partes = nomeCompleto.trim().split(/\s+/);
    const nomeFormatado = partes.length >= 2
        ? `${partes[0]} ${partes[partes.length - 1]}`
        : partes[0] || 'candidato';

    // Empresa
    const empresa = curriculo?.vaga_alvo?.empresa
        || curriculo?.curriculo?.vaga_alvo?.empresa
        || '';

    // Cargo/título: usar campo titulo do curriculo ou headline
    const tituloCustom = curriculo?.curriculo?.titulo_curriculo || '';
    const headline = curriculo?.curriculo?.header?.headline || '';
    // Preferir titulo_curriculo (minimalista), fallback para headline
    const cargo = tituloCustom || headline;

    const limpar = (str) => str
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remover acentos
        .replace(/[^a-z0-9\s]/g, '')                        // remover especiais
        .trim()
        .replace(/\s+/g, '_');

    const partesTitulo = ['cv'];
    if (nomeFormatado) partesTitulo.push(limpar(nomeFormatado));
    if (empresa) partesTitulo.push(limpar(empresa));
    if (cargo) partesTitulo.push(limpar(cargo));

    return partesTitulo.join('_');
}

function closeVisualizadorModal() {
    document.getElementById('visualizadorModal').style.display = 'none';
    document.getElementById('resumeIframe').src = '';
}

function imprimirDoVisualizador() {
    const iframe = document.getElementById('resumeIframe');
    if (iframe.contentWindow) {
        iframe.contentWindow.print();
    }
}

function downloadJsonCurriculo() {
    if (!curriculoAtual) return;
    const dataStr = JSON.stringify(curriculoAtual, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const vaga = todasVagas.find(v => v.uuid === vagaAtualUUID);
    const filename = `curriculo_${vaga ? vaga.empresa.replace(/\s+/g, '_') : 'vaga'}_${new Date().toISOString().split('T')[0]}.json`;
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', filename);
    link.click();
}

function showModalStatus(elementId, type, msg) {
    const s = document.getElementById(elementId);
    s.className = `status ${type}`;
    s.textContent = msg;
    s.style.display = 'block';
    setTimeout(() => s.style.display = 'none', 5000);
}