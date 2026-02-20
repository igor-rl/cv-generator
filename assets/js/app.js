/**
 * app.js — Application shell: navigation, routing, utilities, SW update handling
 */

const App = (() => {
  let currentPage = 'home';

  // ── Init ────────────────────────────────────────────────────────────────────
  function init() {
    setupNavigation();
    setupCookieBanner();
    handleInstallPrompt();
    registerSW();

    const initialPage = Router.init();
    navigateTo(initialPage, { updateUrl: false });
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  function setupNavigation() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        const target = el.dataset.nav;
        if (target === 'history-mobile') {
          openHistoryTypeModal();
        } else {
          navigateTo(target);
        }
      });
    });
  }

  function navigateTo(page, { updateUrl = true } = {}) {
    currentPage = page;

    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === page);
    });

    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.id === `page-${page}`);
    });

    if (updateUrl && window.Router) {
      Router.navigate(page, { replace: false });
    }

    switch (page) {
      case 'vagas':    window.VagasModule?.load();                 break;
      case 'profile':  window.ProfileModule?.load();               break;
      case 'exp':      window.HistoryModule?.loadExperiences();    break;
      case 'edu':      window.HistoryModule?.loadEducation();      break;
      case 'certs':    window.HistoryModule?.loadCertifications(); break;
      case 'langs':    window.HistoryModule?.loadLanguages();      break;
      case 'settings': window.SettingsModule?.load();              break;
    }

    document.getElementById('historyTypeModal')?.classList.remove('open');
  }

  function openHistoryTypeModal() {
    document.getElementById('historyTypeModal').classList.add('open');
  }

  // ── Cookie Banner ─────────────────────────────────────────────────────────────
  function setupCookieBanner() {
    if (!localStorage.getItem('cookies_accepted')) {
      const banner = document.getElementById('cookieBanner');
      if (banner) banner.classList.add('show');
    }
  }

  function acceptCookies() {
    localStorage.setItem('cookies_accepted', '1');
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.classList.remove('show');
  }

  // ── PWA Install ───────────────────────────────────────────────────────────────
  let deferredInstallPrompt = null;

  function handleInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const banner = document.getElementById('installBanner');
      if (banner) banner.style.display = 'flex';
    });

    window.addEventListener('appinstalled', () => {
      const banner = document.getElementById('installBanner');
      if (banner) banner.style.display = 'none';
      deferredInstallPrompt = null;
    });
  }

  async function installApp() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      const banner = document.getElementById('installBanner');
      if (banner) banner.style.display = 'none';
    }
    deferredInstallPrompt = null;
  }

  // ── Service Worker ────────────────────────────────────────────────────────────
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('[App] SW registrado:', reg.scope);

        navigator.serviceWorker.addEventListener('message', (event) => {
          const msg = event.data;
          if (!msg) return;
          if (msg.type === 'SW_UPDATED') {
            console.log('[App] SW atualizado para versão:', msg.version);
            if (msg.reload) {
              setTimeout(() => window.location.reload(), 500);
            }
          }
        });

        setInterval(() => reg.update(), 60 * 1000);
      } catch (err) {
        console.warn('[App] SW falhou:', err);
      }
    });
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  /*
   * SCROLL NAS MODAIS — 100% CSS, zero JS bloqueando eventos.
   *
   * O scroll funciona pela cadeia CSS em modals.css:
   *   .modal-overlay  → position:fixed, display:none/flex
   *   .modal-box      → height:min(90vh,800px), display:flex, flex-direction:column, overflow:clip
   *   .modal-body     → flex:1, min-height:0, overflow-y:auto
   *
   * Para travar o body: apenas overflow:hidden enquanto modal está aberta.
   * NÃO usar position:fixed no body (quebra scroll position e causa layout shift).
   * NÃO usar JS preventDefault em touchmove/wheel (briga com o browser).
   */
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      document.body.style.overflow = 'hidden';
      const close = (e) => { if (e.target === el) closeModal(id); };
      el.addEventListener('click', close, { once: true });
    }
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('open');
      const anyOpen = document.querySelector('.modal-overlay.open');
      if (!anyOpen) document.body.style.overflow = '';
    }
  }

  // ── Status messages ───────────────────────────────────────────────────────────
  function showStatus(elementId, type, message, duration = 5000) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `status-msg show ${type}`;
    if (duration) {
      setTimeout(() => el.classList.remove('show'), duration);
    }
  }

  // ── Confirm dialog ────────────────────────────────────────────────────────────
  function confirm(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent   = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOkBtn').onclick = () => {
      closeModal('confirmModal');
      onConfirm();
    };
    openModal('confirmModal');
  }

  // ── Utilities ─────────────────────────────────────────────────────────────────
  function esc(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  function formatYearMonth(str) {
    if (!str) return '';
    if (str.length === 4) return str;
    const [y, m] = str.split('-');
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${months[parseInt(m)-1]}/${y}`;
  }

  return {
    init,
    navigateTo,
    openModal,
    closeModal,
    showStatus,
    confirm,
    esc,
    formatDate,
    formatYearMonth,
    acceptCookies,
    installApp,
    openHistoryTypeModal,
  };
})();

function navigateTo(page)   { App.navigateTo(page); }
function openModal(id)      { App.openModal(id); }
function closeModal(id)     { App.closeModal(id); }
function acceptCookies()    { App.acceptCookies(); }
function instalarApp()      { App.installApp(); }

document.addEventListener('DOMContentLoaded', () => App.init());