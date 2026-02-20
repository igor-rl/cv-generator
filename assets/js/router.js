/**
 * router.js — Client-side router com hash-based routing
 *
 * Rotas disponíveis:
 *   /          → home
 *   /home      → home
 *   /profile   → profile
 *   /exp       → exp
 *   /edu       → edu
 *   /certs     → certs
 *   /langs     → langs
 *   /vagas     → vagas
 *   /config    → settings
 *
 * Usa History API (pushState) com fallback para hash em ambientes file://
 */

const Router = (() => {
  // Mapa de rotas → page id
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

  // Inverso: page id → path canônico
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

  function getPageFromPath(path) {
    // Remove leading slash e query string
    const clean = (path || '').replace(/^\//, '').split('?')[0].split('#')[0].toLowerCase();
    return ROUTES[clean] || 'home';
  }

  function getCurrentPath() {
    return window.location.pathname;
  }

  function navigate(page, { replace = false } = {}) {
    const path = PAGE_TO_PATH[page] || '/home';
    if (replace) {
      history.replaceState({ page }, '', path);
    } else {
      history.pushState({ page }, '', path);
    }
    App.navigateTo(page, { updateUrl: false });
  }

  function init() {
    // Lida com navegação pelo histórico do browser (botão voltar/avançar)
    window.addEventListener('popstate', (e) => {
      const page = e.state?.page || getPageFromPath(window.location.pathname);
      App.navigateTo(page, { updateUrl: false });
    });

    // Intercepta clicks em links internos (se houver)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-route]');
      if (!link) return;
      e.preventDefault();
      navigate(link.dataset.route);
    });

    // Rota inicial baseada na URL atual
    const initialPage = getPageFromPath(window.location.pathname);
    // Substitui a URL atual sem criar nova entrada no histórico
    history.replaceState({ page: initialPage }, '', PAGE_TO_PATH[initialPage] || '/home');
    return initialPage;
  }

  return { init, navigate, getPageFromPath, PAGE_TO_PATH };
})();

window.Router = Router;