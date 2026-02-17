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
        
        // Ordenar por data de cadastro (mais recentes primeiro)
        todasVagas.sort((a, b) => new Date(b.data_cadastro) - new Date(a.data_cadastro));
        
        filterVagas();
    } catch (err) {
        console.error('Erro ao carregar vagas:', err);
        showStatus('error', 'Erro ao carregar vagas');
    }
}

function filterVagas() {
    const statusFilter = document.getElementById('statusFilter').value;
    
    if (statusFilter === 'all') {
        vagasFiltradas = [...todasVagas];
    } else {
        vagasFiltradas = todasVagas.filter(v => v.status === statusFilter);
    }
    
    paginaAtual = 1;
    renderizarVagas();
}

function renderizarVagas() {
    const startIndex = (paginaAtual - 1) * vagasPorPagina;
    const endIndex = startIndex + vagasPorPagina;
    const vagasPagina = vagasFiltradas.slice(startIndex, endIndex);
    
    const container = document.getElementById('vagasList');
    
    if (vagasFiltradas.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <p>Nenhuma vaga encontrada.</p>
                <button class="btn btn-primary" style="margin-top: 16px;" onclick="openNovaVagaModal()">➕ Criar Primeira Vaga</button>
            </div>
        `;
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    container.innerHTML = vagasPagina.map(vaga => `
        <div class="vaga-card">
            <div class="vaga-header">
                <div>
                    <div class="vaga-title">${vaga.cargo}</div>
                    <div class="vaga-empresa">${vaga.empresa}</div>
                </div>
                <div class="vaga-status status-${vaga.status}">
                    ${formatarStatus(vaga.status)}
                </div>
            </div>
            <div class="vaga-meta">
                <span>📅 Cadastrada em ${formatarData(vaga.data_cadastro)}</span>
                <span>🔄 Atualizada em ${formatarData(vaga.data_atualizacao)}</span>
            </div>
            <div class="vaga-descricao">${vaga.descricao.substring(0, 200)}...</div>
            <div class="vaga-actions">
                <button class="btn btn-primary btn-small" onclick="gerarPromptVaga('${vaga.uuid}')">
                    🚀 Gerar Currículo
                </button>
                ${existeCurriculo(vaga.uuid) ? `
                    <button class="btn btn-success btn-small" onclick="visualizarCurriculo('${vaga.uuid}')">
                        👁️ Ver Currículo
                    </button>
                ` : ''}
                <button class="btn btn-secondary btn-small" onclick="editarVaga('${vaga.uuid}')">
                    ✏️ Editar
                </button>
                <button class="btn btn-secondary btn-small" onclick="verDescricao('${vaga.uuid}')">
                    📄 Ver Descrição
                </button>
                <button class="btn btn-danger btn-small" onclick="excluirVaga('${vaga.uuid}')">
                    🗑️ Excluir
                </button>
            </div>
        </div>
    `).join('');
    
    renderizarPaginacao();
}

function renderizarPaginacao() {
    const totalPaginas = Math.ceil(vagasFiltradas.length / vagasPorPagina);
    const container = document.getElementById('pagination');
    
    if (totalPaginas <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botão anterior
    html += `<button class="page-btn" ${paginaAtual === 1 ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual - 1})">←</button>`;
    
    // Números de página
    for (let i = 1; i <= totalPaginas; i++) {
        html += `<button class="page-btn ${paginaAtual === i ? 'active' : ''}" onclick="mudarPagina(${i})">${i}</button>`;
    }
    
    // Botão próximo
    html += `<button class="page-btn" ${paginaAtual === totalPaginas ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual + 1})">→</button>`;
    
    container.innerHTML = html;
}

function mudarPagina(pagina) {
    paginaAtual = pagina;
    renderizarVagas();
}

function formatarStatus(status) {
    const statusMap = {
        'criada': 'Criada',
        'aplicada': 'Aplicada',
        'entrevista': 'Em Entrevista',
        'rejeitada': 'Rejeitada',
        'desisti': 'Desisti',
        'nao_passei': 'Não Passei'
    };
    return statusMap[status] || status;
}

function formatarData(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function existeCurriculo(vagaUUID) {
    // Verificar se existe currículo salvo no localStorage
    return localStorage.getItem(`curriculo_${vagaUUID}`) !== null;
}

// =============== MODAIS ===============

function openNovaVagaModal() {
    document.getElementById('novaVagaModal').style.display = 'flex';
    document.getElementById('modal_empresa').value = '';
    document.getElementById('modal_cargo').value = '';
    document.getElementById('modal_descricao').value = '';
}

function closeNovaVagaModal() {
    document.getElementById('novaVagaModal').style.display = 'none';
}

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
        setTimeout(() => {
            closeNovaVagaModal();
            carregarVagas();
        }, 1000);
    } catch (err) {
        console.error(err);
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

function closeEditVagaModal() {
    document.getElementById('editVagaModal').style.display = 'none';
}

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
        setTimeout(() => {
            closeEditVagaModal();
            carregarVagas();
        }, 1000);
    } catch (err) {
        console.error(err);
        showModalStatus('editModalStatus', 'error', '❌ Erro ao atualizar vaga');
    }
}

function verDescricao(uuid) {
    const vaga = todasVagas.find(v => v.uuid === uuid);
    if (!vaga) return;
    
    alert(`Empresa: ${vaga.empresa}\nCargo: ${vaga.cargo}\n\n${vaga.descricao}`);
}

async function excluirVaga(uuid) {
    const vaga = todasVagas.find(v => v.uuid === uuid);
    if (!vaga) return;
    
    const confirmacao = confirm(
        `⚠️ ATENÇÃO!\n\n` +
        `Deseja realmente excluir esta vaga?\n\n` +
        `Empresa: ${vaga.empresa}\n` +
        `Cargo: ${vaga.cargo}\n\n` +
        `Esta ação NÃO pode ser desfeita.\n` +
        `O currículo gerado para esta vaga também será excluído.`
    );
    
    if (!confirmacao) return;
    
    try {
        // Excluir do servidor
        const res = await fetch(`/api/vagas/delete/${uuid}`, {
            method: 'POST'
        });
        
        if (!res.ok) throw new Error('Erro ao excluir vaga');
        
        // Remover currículo do localStorage
        localStorage.removeItem(`curriculo_${uuid}`);
        
        // Recarregar lista
        await carregarVagas();
        
        alert('✅ Vaga excluída com sucesso!');
        
    } catch (err) {
        console.error('Erro ao excluir vaga:', err);
        alert('❌ Erro ao excluir vaga');
    }
}

// =============== GERAÇÃO DE PROMPT ===============

async function gerarPromptVaga(uuid) {
    vagaAtualUUID = uuid;
    const vaga = todasVagas.find(v => v.uuid === uuid);
    if (!vaga) return;
    
    try {
        // Adicionar timestamp para evitar cache
        const timestamp = new Date().getTime();
        
        // Carregar todos os arquivos necessários com cache-busting
        const [
            historyRes,
            masterPromptRes,
            fase1Res,
            fase2Res,
            fase3Res,
            fase4Res,
            fase5Res,
            eligibilitySchemaRes,
            finalOutputSchemaRes,
            personalHistorySchemaRes,
            personalInfoSchemaRes
        ] = await Promise.all([
            fetch(`/data/personal-history.md?t=${timestamp}`),
            fetch(`/core/prompts/master-prompt.md?t=${timestamp}`),
            fetch(`/core/prompts/fase1.md?t=${timestamp}`),
            fetch(`/core/prompts/fase2.md?t=${timestamp}`),
            fetch(`/core/prompts/fase3.md?t=${timestamp}`),
            fetch(`/core/prompts/fase4.md?t=${timestamp}`),
            fetch(`/core/prompts/fase5.md?t=${timestamp}`),
            fetch(`/core/contracts/elegibility.schema.json?t=${timestamp}`),
            fetch(`/core/contracts/final-output.schema.json?t=${timestamp}`),
            fetch(`/core/contracts/personal-history.schema.json?t=${timestamp}`),
            fetch(`/core/contracts/personal-info.schema.json?t=${timestamp}`)
        ]);
        
        // Ler conteúdos
        const history = await historyRes.text();
        let masterPrompt = await masterPromptRes.text();
        const fase1 = await fase1Res.text();
        const fase2 = await fase2Res.text();
        const fase3 = await fase3Res.text();
        const fase4 = await fase4Res.text();
        const fase5 = await fase5Res.text();
        const eligibilitySchema = await eligibilitySchemaRes.text();
        const finalOutputSchema = await finalOutputSchemaRes.text();
        const personalHistorySchema = await personalHistorySchemaRes.text();
        const personalInfoSchema = await personalInfoSchemaRes.text();
        
        // Substituir placeholders principais no master-prompt
        masterPrompt = masterPrompt.replace('{{PROFESSIONAL_HISTORY}}', history);
        masterPrompt = masterPrompt.replace('{{JOB_DESCRIPTION}}', vaga.descricao);
        
        // Substituir fases
        masterPrompt = masterPrompt.replace('{{FASE_1}}', fase1);
        masterPrompt = masterPrompt.replace('{{FASE_2}}', fase2);
        masterPrompt = masterPrompt.replace('{{FASE_3}}', fase3);
        masterPrompt = masterPrompt.replace('{{FASE_4}}', fase4);
        masterPrompt = masterPrompt.replace('{{FASE_5}}', fase5);
        
        // Substituir schemas nas fases (caso existam referências)
        masterPrompt = masterPrompt.replace(/\/\/core\/contracts\/elegibility\.schema\.json/g, '');
        masterPrompt = masterPrompt.replace(/{{ELEGIBILITY_SCHEMA}}/g, eligibilitySchema);
        masterPrompt = masterPrompt.replace(/\/\/core\/contracts\/final-output\.schema\.json/g, '');
        masterPrompt = masterPrompt.replace(/{{FINAL_OUTPUT_SCHEMA}}/g, finalOutputSchema);
        
        // Adicionar schemas inline após menções
        masterPrompt = masterPrompt.replace(/seguindo o schema `elegibility\.schema\.json`/g, 
            `seguindo este schema:\n\`\`\`json\n${eligibilitySchema}\n\`\`\``);
        
        masterPrompt = masterPrompt.replace(/seguindo o schema `final-output\.schema\.json`/g, 
            `seguindo este schema:\n\`\`\`json\n${finalOutputSchema}\n\`\`\``);
        
        // Remover linhas que referenciam PERSONAL_DATA (não enviamos dados pessoais)
        masterPrompt = masterPrompt.replace(/### INFORMAÇÕES PESSOAIS DO CANDIDATO:[\s\S]*?```json[\s\S]*?{{PERSONAL_DATA}}[\s\S]*?```/g, '');
        
        // Adicionar cabeçalho informativo
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
        alert('Erro ao gerar prompt. Verifique se todos os arquivos necessários existem:\n' + err.message);
    }
}

function closePromptModal() {
    document.getElementById('promptModal').style.display = 'none';
}

function copyPrompt() {
    const prompt = document.getElementById('generatedPrompt').textContent;
    navigator.clipboard.writeText(prompt).then(() => {
        alert('✅ Prompt copiado para a área de transferência!');
    });
}

function avancarParaColarResposta() {
    closePromptModal();
    document.getElementById('resposta_vaga_uuid').value = vagaAtualUUID;
    document.getElementById('jsonResposta').value = '';
    document.getElementById('respostaModal').style.display = 'flex';
}

function closeRespostaModal() {
    document.getElementById('respostaModal').style.display = 'none';
}

function voltarParaPrompt() {
    closeRespostaModal();
    document.getElementById('promptModal').style.display = 'flex';
}

// =============== GERAÇÃO DE CURRÍCULO ===============

async function gerarCurriculo() {
    const vagaUUID = document.getElementById('resposta_vaga_uuid').value;
    const jsonText = document.getElementById('jsonResposta').value.trim();
    
    if (!jsonText) {
        showModalStatus('respostaStatus', 'error', 'Cole o JSON retornado pelo ChatGPT!');
        return;
    }
    
    try {
        const jsonData = JSON.parse(jsonText);
        
        // Validar estrutura básica
        if (!jsonData.elegibilidade || !jsonData.curriculo) {
            throw new Error('JSON inválido: faltam campos obrigatórios');
        }
        
        // Salvar no servidor
        const res = await fetch(`/api/curriculo/${vagaUUID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData)
        });
        
        if (!res.ok) throw new Error('Erro ao salvar currículo');
        
        // Salvar também no localStorage para acesso rápido
        localStorage.setItem(`curriculo_${vagaUUID}`, JSON.stringify(jsonData));
        
        curriculoAtual = jsonData;
        vagaAtualUUID = vagaUUID;
        
        closeRespostaModal();
        mostrarCurriculoGerado();
        carregarVagas(); // Atualizar lista para mostrar botão "Ver Currículo"
        
    } catch (err) {
        console.error('Erro ao processar JSON:', err);
        showModalStatus('respostaStatus', 'error', `❌ ${err.message}`);
    }
}

function mostrarCurriculoGerado() {
    if (!curriculoAtual) return;
    
    const eligibility = curriculoAtual.elegibilidade;
    
    let html = `
        <div class="eligibility-card">
            <div class="eligibility-score">
                <div class="stars">${'⭐'.repeat(eligibility.pontuacao_estrelas)}</div>
                <div class="score-status ${getEligibilityClass(eligibility.status)}">
                    ${eligibility.status}
                </div>
                ${eligibility.pontuacao_percentual ? `<div>${eligibility.pontuacao_percentual}% de compatibilidade</div>` : ''}
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 12px;">✅ Pontos Fortes:</h4>
                <ul class="points-list strengths">
                    ${eligibility.pontos_fortes.map(p => `<li>${p}</li>`).join('')}
                </ul>
            </div>
            
            ${eligibility.pontos_fracos && eligibility.pontos_fracos.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 12px;">⚠️ Pontos Fracos:</h4>
                    <ul class="points-list weaknesses">
                        ${eligibility.pontos_fracos.map(p => `<li>${p}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${eligibility.sugestoes && eligibility.sugestoes.length > 0 ? `
                <div>
                    <h4 style="margin-bottom: 12px;">💡 Sugestões:</h4>
                    <ul class="points-list suggestions">
                        ${eligibility.sugestoes.map(p => `<li>${p}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <div style="margin-top: 20px; padding: 16px; background: white; border-radius: 8px;">
                <strong>Recomendação:</strong> ${eligibility.recomendacao}
            </div>
        </div>
    `;
    
    document.getElementById('eligibilityContent').innerHTML = html;
    document.getElementById('curriculoModal').style.display = 'flex';
}

function getEligibilityClass(status) {
    if (status.includes('ELEGÍVEL') && !status.includes('NÃO')) return 'eligible';
    if (status.includes('PARCIAL')) return 'partial';
    return 'not-eligible';
}

async function visualizarCurriculo(uuid) {
    try {
        // Tentar carregar do servidor
        const res = await fetch(`/api/curriculo/${uuid}`);
        
        if (res.ok) {
            curriculoAtual = await res.json();
        } else {
            // Fallback para localStorage
            const stored = localStorage.getItem(`curriculo_${uuid}`);
            if (stored) {
                curriculoAtual = JSON.parse(stored);
            } else {
                throw new Error('Currículo não encontrado');
            }
        }
        
        vagaAtualUUID = uuid;
        mostrarCurriculoGerado();
        
    } catch (err) {
        console.error('Erro ao carregar currículo:', err);
        alert('Erro ao carregar currículo');
    }
}

function closeCurriculoModal() {
    document.getElementById('curriculoModal').style.display = 'none';
}

function abrirVisualizacaoCurriculo() {
    if (!curriculoAtual) return;
    
    // Carregar dados pessoais com cache-busting
    const timestamp = new Date().getTime();
    fetch(`/data/personal-data.json?t=${timestamp}`)
        .then(res => res.json())
        .then(personalData => {
            console.log('Personal data carregado:', personalData);
            console.log('Curriculo atual:', curriculoAtual.curriculo);
            
            // Mesclar dados pessoais com currículo
            const resumeData = {
                ...curriculoAtual.curriculo,
                personalData: personalData  // Adicionar como propriedade separada
            };
            
            console.log('Resume data final:', resumeData);
            
            // Salvar no sessionStorage
            sessionStorage.setItem('current_resume', JSON.stringify(resumeData));
            
            // Abrir em nova janela
            window.open('resume.html', '_blank');
        })
        .catch(err => {
            console.error('Erro ao carregar dados pessoais:', err);
            alert('Erro ao carregar dados pessoais: ' + err.message);
        });
}

function downloadJsonCurriculo() {
    if (!curriculoAtual) return;
    
    const dataStr = JSON.stringify(curriculoAtual, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const vaga = todasVagas.find(v => v.uuid === vagaAtualUUID);
    const filename = `curriculo_${vaga ? vaga.empresa.replace(/\s+/g, '_') : 'vaga'}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', filename);
    linkElement.click();
}

function showModalStatus(elementId, type, msg) {
    const s = document.getElementById(elementId);
    s.className = `status ${type}`;
    s.textContent = msg;
    s.style.display = 'block';
    setTimeout(() => s.style.display = 'none', 5000);
}