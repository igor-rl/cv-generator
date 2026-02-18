/**
 * sw.js — Service Worker
 * Cache-first para assets estáticos, network-first para dados dinâmicos
 */

const CACHE_NAME = 'curriculos-v3.0.12';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/resume.html',
  '/assets/css/main.css',
  '/assets/css/resume.css',
  '/assets/js/db.js',
  '/assets/js/main.js',
  '/assets/js/vagas.js',
  '/core/prompts/master-prompt.md',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300;1,9..40,400&family=DM+Mono:wght@400;500&display=swap',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Ignorar extensões Chrome e requests não-GET
  if (e.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Cache-first para assets estáticos
  const isStatic = STATIC_ASSETS.some(a => e.request.url.includes(a.replace('/', '')));
  const isCorePrompt = url.pathname.startsWith('/core/prompts/');
  const isFont = url.hostname.includes('fonts.g');

  if (isStatic || isCorePrompt || isFont) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Network-first com fallback para cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
