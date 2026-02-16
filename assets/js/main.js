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
        const historyRes = await fetch('/data/personal-history.md');

        const personal = personalRes.ok ? await personalRes.json() : {};
        const history = historyRes.ok ? await historyRes.text() : '';

        Object.keys(personal).forEach(k => {
            const el = document.getElementById(k);
            if (el) el.type === 'checkbox' ? el.checked = personal[k] : el.value = personal[k];
        });

        if (history) document.getElementById('history').value = history;

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
        portfolio: document.getElementById('portfolio').value.trim()
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
        await loadFromServer(); // <--- Recarrega a tela com os dados atualizados
    } catch (err) {
        console.error(err);
        showStatus('error', '❌ Erro ao salvar dados');
    }
}



function loadSampleData() {
    const sample = {
        personal: { name: 'João Silva', email: 'joao@email.com', phone: '', city: '', state: '', remote: false, linkedin: '', github: '', portfolio: '' },
        history: '## Experiência Profissional\n\n### Empresa X - Cargo\n- Responsabilidades...'
    };
    Object.keys(sample.personal).forEach(k => {
        const el = document.getElementById(k);
        if (el) el.type==='checkbox'?el.checked=sample.personal[k]:el.value=sample.personal[k];
    });
    document.getElementById('history').value = sample.history;
    showStatus('success', '✅ Dados de exemplo carregados!');
}

function clearAllData() {
    if (!confirm('Deseja apagar todos os dados?')) return;
    ['name','email','phone','city','state','remote','linkedin','github','portfolio','history'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.type==='checkbox'?el.checked=false:el.value='';
    });
    showStatus('success','✅ Todos os dados foram apagados.');
}

function showStatus(type, msg) {
    const s = document.getElementById('saveStatus');
    s.className = `status ${type}`;
    s.textContent = msg;
    s.style.display = 'block';
    setTimeout(()=>s.style.display='none',5000);
}
