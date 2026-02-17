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
        const timestamp = new Date().getTime();

        // Carregar dados pessoais
        const personalRes = await fetch(`/data/personal-data.json?t=${timestamp}`);
        if (personalRes.ok) {
            const personal = await personalRes.json();
            preencherDadosPessoais(personal);
        }

        // Carregar histórico profissional
        const historyRes = await fetch(`/data/personal-history.md?t=${timestamp}`);
        if (historyRes.ok) {
            const history = await historyRes.text();
            const historyField = document.getElementById('history');
            if (historyField && history) {
                historyField.value = history;
            }
        }

    } catch (err) {
        console.error('Erro ao carregar dados do servidor:', err);
    }
}

function preencherDadosPessoais(personal) {
    // Campos de texto
    const campos = ['name', 'email', 'phone', 'city', 'state', 'linkedin', 'github', 'portfolio'];
    campos.forEach(campo => {
        const el = document.getElementById(campo);
        if (el && personal[campo] !== undefined) {
            el.value = personal[campo];
        }
    });

    // Checkbox remoto
    const remoteEl = document.getElementById('remote');
    if (remoteEl) remoteEl.checked = personal.remote === true;

    // Checkboxes de inclusão
    const checkboxes = [
        'include_phone', 'include_city', 'include_state',
        'include_remote', 'include_linkedin', 'include_github', 'include_portfolio'
    ];
    checkboxes.forEach(campo => {
        const el = document.getElementById(campo);
        if (el && personal[campo] !== undefined) {
            el.checked = personal[campo] === true;
        }
    });
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
        include_name: true,
        include_email: true,
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
    setTimeout(() => s.style.display = 'none', 5000);
}