/**
 * sw.js — Service Worker v5
 *
 * ESTRATÉGIA DE ATUALIZAÇÃO:
 * - CACHE_VERSION é gerado em build time (ver generate-version.js) ou manualmente
 * - Ao detectar novo SW, força skipWaiting e clients.claim imediatamente
 * - Usa "network first" para arquivos HTML/JS/CSS para garantir frescor
 * - Usa "cache first" apenas para fontes e imagens externas
 *
 * PARA DESENVOLVEDORES: bump CACHE_VERSION a cada deploy.
 * O formato recomendado é um timestamp ou hash gerado automaticamente.
 */

// ─── BUMP ESTE VALOR A CADA DEPLOY ────────────────────────────────────────────
const CACHE_VERSION = '__CACHE_VERSION__'; // substituído pelo generate-version.js
// ──────────────────────────────────────────────────────────────────────────────

const CACHE_NAME    = `curriculos-v${CACHE_VERSION}`;
const OFFLINE_PAGE  = '/index.html';

// Assets que queremos pré-cachear (shell do app)
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/resume.html',
  '/manifest.json',
  '/assets/css/base.css',
  '/assets/css/layout.css',
  '/assets/css/components.css',
  '/assets/css/modals.css',
  '/assets/css/pages.css',
  '/assets/js/db.js',
  '/assets/js/app.js',
  '/assets/js/groq.js',
  '/assets/js/profile.js',
  '/assets/js/history.js',
  '/assets/js/vagas.js',
  '/assets/js/settings.js',
  '/core/prompts/master-prompt.md',
  '/core/prompts/change-prompt.md',
];

// ── Install: pré-cache do shell ───────────────────────────────────────────────
self.addEventListener('install', (e) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => {
        console.log('[SW] Shell cached, forcing activation');
        // Força ativação imediata sem esperar tabs fecharem
        return self.skipWaiting();
      })
  );
});

// ── Activate: limpa caches antigos e toma controle ───────────────────────────
self.addEventListener('activate', (e) => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  e.waitUntil(
    caches.keys()
      .then(keys => {
        const deleteOld = keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          });
        return Promise.all(deleteOld);
      })
      .then(() => {
        console.log('[SW] Claiming all clients');
        // Toma controle de todas as tabs abertas imediatamente
        return self.clients.claim();
      })
      .then(() => {
        // Notifica todos os clientes para recarregar
        return self.clients.matchAll({ type: 'window' });
      })
      .then(clients => {
        clients.forEach(client => {
          console.log('[SW] Notifying client to reload');
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      })
  );
});

// ── Fetch: Network First para app shell, Cache First para fontes ──────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Ignora requests não-GET
  if (e.request.method !== 'GET') return;

  // Ignora extensões do Chrome e APIs externas (GROQ, extrator de vagas)
  if (url.protocol === 'chrome-extension:') return;
  if (url.hostname === 'api.groq.com') return;
  if (url.hostname.includes('onrender.com')) return;

  // Fontes do Google: Cache First (mudam raramente, economiza banda)
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // Ícones e imagens locais: Cache First
  if (url.pathname.startsWith('/icons/')) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // Todo o resto (HTML, JS, CSS, prompts): Network First
  // Garante que o usuário sempre veja a versão mais recente
  e.respondWith(networkFirst(e.request));
});

// ── Estratégias de cache ──────────────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Atualiza o cache com a resposta fresca
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (err) {
    // Offline: tenta servir do cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback para index.html em caso de navegação
    if (request.mode === 'navigate') {
      const offline = await caches.match(OFFLINE_PAGE);
      if (offline) return offline;
    }

    // Sem cache e sem rede: erro
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    throw err;
  }
}

// ── Mensagens do cliente ──────────────────────────────────────────────────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});