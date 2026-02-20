/**
 * sw.js — Service Worker v6
 *
 * ESTRATÉGIA DE ATUALIZAÇÃO:
 * - CACHE_VERSION é gerado automaticamente via timestamp no build
 * - Ao detectar novo SW: skipWaiting imediato + clients.claim + reload de todos os clientes
 * - Network First para tudo — garante sempre a versão mais recente
 * - Cache serve apenas de fallback offline
 *
 * PROBLEMA RESOLVIDO: versão antiga ficava servida mesmo após mudanças.
 * SOLUÇÃO: Network First + reload automático ao ativar novo SW.
 */

// ─── BUMP ESTE VALOR A CADA DEPLOY ────────────────────────────────────────────
const CACHE_VERSION = '__CACHE_VERSION__'; // substituído pelo generate-version.js
// ──────────────────────────────────────────────────────────────────────────────

const CACHE_NAME   = `curriculos-v${CACHE_VERSION}`;
const OFFLINE_PAGE = '/index.html';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/resume.html',
  '/manifest.json',
  '/views/sidebar.html',
  '/views/modals.html',
  '/views/pages/home.html',
  '/views/pages/profile.html',
  '/views/pages/exp.html',
  '/views/pages/edu.html',
  '/views/pages/certs.html',
  '/views/pages/langs.html',
  '/views/pages/vagas.html',
  '/views/pages/settings.html',
  '/assets/css/base.css',
  '/assets/css/layout.css',
  '/assets/css/components.css',
  '/assets/css/modals.css',
  '/assets/css/pages.css',
  '/assets/js/db.js',
  '/assets/js/app.js',
  '/assets/js/router.js',
  '/assets/js/groq.js',
  '/assets/js/profile.js',
  '/assets/js/history.js',
  '/assets/js/vagas.js',
  '/assets/js/settings.js',
  '/core/prompts/master-prompt.md',
  '/core/prompts/change-prompt.md',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Tenta cachear tudo, mas não falha se algum asset não existir
        return Promise.allSettled(
          SHELL_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Falha ao cachear:', url, err))
          )
        );
      })
      .then(() => {
        console.log('[SW] Installed, forcing activation immediately');
        return self.skipWaiting(); // Ativa imediatamente sem esperar tabs fecharem
      })
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  e.waitUntil(
    caches.keys()
      .then(keys => {
        const deleteOld = keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Deletando cache antigo:', k);
            return caches.delete(k);
          });
        return Promise.all(deleteOld);
      })
      .then(() => self.clients.claim()) // Toma controle de todas as tabs abertas
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        // Notifica TODOS os clientes para recarregar a página
        // Isso resolve o problema de ver a versão antiga após deploy
        clients.forEach(client => {
          console.log('[SW] Solicitando reload do cliente:', client.url);
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION,
            reload: true,
          });
        });
      })
  );
});

// ── Fetch: Network First para tudo ───────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  if (e.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.hostname === 'api.groq.com') return;
  if (url.hostname.includes('onrender.com')) return;
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(cacheFirst(e.request));
    return;
  }
  if (url.pathname.startsWith('/icons/')) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // Network First para TODO o resto — garante sempre conteúdo atualizado
  e.respondWith(networkFirst(e.request));
});

// ── Estratégias ───────────────────────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request, { cache: 'no-cache' }); // força no-cache
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const offline = await caches.match(OFFLINE_PAGE);
      if (offline) return offline;
    }
    throw new Error('Offline e sem cache para: ' + request.url);
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
  if (e.data?.type === 'CHECK_VERSION') {
    e.source?.postMessage({ type: 'SW_VERSION', version: CACHE_VERSION });
  }
});