document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    loadFromServer();
});

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

async function loadFromServer() {
    try {
        const personalRes = await fetch('/data/personal-data.json');
        const curriculoRes = await fetch('/data/curriculo.json'); // se tiver um arquivo JSON do currículo
        const vagaRes = await fetch('/data/vaga-alvo.json'); // ou vem junto com curriculo.json

        const personal = personalRes.ok ? await personalRes.json() : {};
        const curriculo = curriculoRes.ok ? await curriculoRes.json() : {};
        const vaga = vagaRes.ok ? await vagaRes.json() : {};

        // Salvar tudo no sessionStorage
        sessionStorage.setItem('current_resume', JSON.stringify({
            personalData: personal,
            curriculo: curriculo,
            vaga_alvo: vaga
        }));

    } catch (err) {
        console.error('Erro ao carregar dados do servidor:', err);
    }
}


async function saveData() {
    const personal = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value.trim(),
        remote: document.getElementById('remote').checked,
        linkedin: document.getElementById('linkedin').value.trim(),
        github: document.getElementById('github').value.trim(),
        portfolio: document.getElementById('portfolio').value.trim(),
        // Incluir flags de quais campos devem aparecer no currículo
        include_name: document.getElementById('include_name').checked,
        include_email: document.getElementById('include_email').checked,
        include_phone: document.getElementById('include_phone').checked,
        include_city: document.getElementById('include_city').checked,
        include_state: document.getElementById('include_state').checked,
        include_remote: document.getElementById('include_remote').checked,
        include_linkedin: document.getElementById('include_linkedin').checked,
        include_github: document.getElementById('include_github').checked,
        include_portfolio: document.getElementById('include_portfolio').checked
    };

    const history = document.getElementById('history').value.trim();

    if (!personal.name || !personal.email) {
        showStatus('error', 'Nome e email são obrigatórios!');
        return;
    }

    if (!history) {
        showStatus('error', 'Histórico profissional é obrigatório!');
        return;
    }

    try {
        const resPersonal = await fetch('/save-personal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(personal)
        });
        if (!resPersonal.ok) throw new Error('Erro ao salvar personal');

        const resHistory = await fetch('/save-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history })
        });
        if (!resHistory.ok) throw new Error('Erro ao salvar history');

        showStatus('success', '✅ Dados salvos com sucesso!');
        await loadFromServer();
    } catch (err) {
        console.error(err);
        showStatus('error', '❌ Erro ao salvar dados');
    }
}

function showStatus(type, msg) {
    const s = document.getElementById('saveStatus');
    s.className = `status ${type}`;
    s.textContent = msg;
    s.style.display = 'block';
    setTimeout(()=>s.style.display='none',5000);
}