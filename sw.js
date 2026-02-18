/**
 * sw.js — Service Worker v4
 */

const CACHE_NAME = 'curriculos-v4.0.2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/resume.html',
  '/assets/css/main.css',
  '/assets/css/resume.css',
  '/assets/js/db.js',
  '/assets/js/app.js',
  '/assets/js/groq.js',
  '/assets/js/profile.js',
  '/assets/js/history.js',
  '/assets/js/vagas.js',
  '/assets/js/backup.js',
  '/assets/js/settings.js',
  '/core/prompts/master-prompt.md',
  '/core/prompts/change-prompt.md',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  // Don't cache GROQ API calls
  if (url.hostname === 'api.groq.com') return;

  const isStatic = STATIC_ASSETS.some(a => e.request.url.endsWith(a.replace(/^\//, '')));
  const isCoreFile = url.pathname.startsWith('/core/');
  const isFont = url.hostname.includes('fonts.g');

  if (isStatic || isCoreFile || isFont) {
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

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});