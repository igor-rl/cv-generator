/**
 * router.js — SPA Router universal
 *
 * Funciona:
 * - Local dev / file:// → hash fallback (#home, #profile, etc)
 * - Docker / local server → History API
 * - Produção (Vercel) → History API
 */

const Router = (() => {
  const ROUTES = {
    '':        'home',
    'home':    'home',
    'profile': 'profile',
    'exp':     'exp',
    'edu':     'edu',
    'certs':   'certs',
    'langs':   'langs',
    'vagas':   'vagas',
    'config':  'settings',
    'settings':'settings',
  };

  const PAGE_TO_PATH = {
    home:     '/home',
    profile:  '/profile',
    exp:      '/exp',
    edu:      '/edu',
    certs:    '/certs',
    langs:    '/langs',
    vagas:    '/vagas',
    settings: '/config',
  };

  const USE_HASH_FALLBACK = window.location.protocol === 'file:' || !window.history.pushState;

  function getPageFromPath(path) {
    const clean = (path || '').replace(/^\//, '').split('?')[0].split('#')[0].toLowerCase();
    return ROUTES[clean] || 'home';
  }

  function getCurrentPath() {
    return USE_HASH_FALLBACK
      ? window.location.hash.replace(/^#/, '') || ''
      : window.location.pathname;
  }

  function navigate(page, { replace = false } = {}) {
    const path = PAGE_TO_PATH[page] || '/home';

    if (USE_HASH_FALLBACK) {
      if (replace) window.location.replace(`#${page}`);
      else window.location.hash = page;
    } else {
      if (replace) history.replaceState({ page }, '', path);
      else history.pushState({ page }, '', path);
    }

    App.navigateTo(page, { updateUrl: false });
  }

  function init() {
    // Botão voltar/avançar
    window.addEventListener('popstate', (e) => {
      const page = e.state?.page || getPageFromPath(getCurrentPath());
      App.navigateTo(page, { updateUrl: false });
    });

    // Hash fallback
    if (USE_HASH_FALLBACK) {
      window.addEventListener('hashchange', () => {
        const page = getPageFromPath(getCurrentPath());
        App.navigateTo(page, { updateUrl: false });
      });
    }

    // Links internos
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-route]');
      if (!link) return;
      e.preventDefault();
      navigate(link.dataset.route);
    });

    // Página inicial
    const initialPage = getPageFromPath(getCurrentPath());

    if (USE_HASH_FALLBACK) window.location.replace(`#${initialPage}`);
    else history.replaceState({ page: initialPage }, '', PAGE_TO_PATH[initialPage] || '/home');

    return initialPage;
  }

  return { init, navigate, getPageFromPath, PAGE_TO_PATH };
})();

window.Router = Router;