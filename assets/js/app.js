/**
 * app.js — Application shell: navigation, routing, utilities
 */

const App = (() => {
  // ── State ───────────────────────────────────────────────────────────────
  let currentPage = 'home';

  // ── Init ────────────────────────────────────────────────────────────────
  function init() {
    setupNavigation();
    setupCookieBanner();
    handleInstallPrompt();
    registerSW();
    navigateTo('home');
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  function setupNavigation() {
    // Sidebar nav items
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

  function navigateTo(page) {
    currentPage = page;

    // Update active states — sidebar
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === page);
    });

    // Show/hide pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.id === `page-${page}`);
    });

    // Load page data
    switch (page) {
      case 'vagas':    window.VagasModule?.load();   break;
      case 'profile':  window.ProfileModule?.load(); break;
      case 'exp':      window.HistoryModule?.loadExperiences(); break;
      case 'edu':      window.HistoryModule?.loadEducation();   break;
      case 'certs':    window.HistoryModule?.loadCertifications(); break;
      case 'langs':    window.HistoryModule?.loadLanguages();    break;
      case 'backup':   /* no load needed */ break;
    }

    // Close any mobile modal
    document.getElementById('historyTypeModal')?.classList.remove('open');
  }

  function openHistoryTypeModal() {
    document.getElementById('historyTypeModal').classList.add('open');
  }

  // ── Cookie Banner ─────────────────────────────────────────────────────────
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

  // ── PWA Install ───────────────────────────────────────────────────────────
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

  // ── SW ────────────────────────────────────────────────────────────────────
  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW:', reg.scope))
          .catch(err => console.warn('SW failed:', err));
      });
    }
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      el.addEventListener('click', (e) => {
        if (e.target === el) closeModal(id);
      }, { once: true });
    }
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  // ── Status messages ───────────────────────────────────────────────────────
  function showStatus(elementId, type, message, duration = 5000) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `status-msg show ${type}`;
    if (duration) {
      setTimeout(() => {
        el.classList.remove('show');
      }, duration);
    }
  }

  // ── Confirm dialog ────────────────────────────────────────────────────────
  function confirm(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent   = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOkBtn').onclick = () => {
      closeModal('confirmModal');
      onConfirm();
    };
    openModal('confirmModal');
  }

  // ── Escape HTML ───────────────────────────────────────────────────────────
  function esc(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  // ── Format date ───────────────────────────────────────────────────────────
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

// ── Global wrappers for onclick attributes ────────────────────────────────────
function navigateTo(page)               { App.navigateTo(page); }
function openModal(id)                  { App.openModal(id); }
function closeModal(id)                 { App.closeModal(id); }
function acceptCookies()                { App.acceptCookies(); }
function instalarApp()                  { App.installApp(); }

document.addEventListener('DOMContentLoaded', () => App.init());