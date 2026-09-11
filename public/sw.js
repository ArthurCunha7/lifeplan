// Service Worker do LifePlan — deixa o app instalável e funcionando (pelo
// menos pra abrir) mesmo sem internet. IMPORTANTE: nunca guarda dados do
// Supabase em cache (login, plano, finanças etc.) — só o "esqueleto" do
// app (HTML/JS/CSS/ícones), pra nunca mostrar informação desatualizada.

const CACHE_VERSION = 'lifeplan-v1';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/estudos.html',
  '/controle-financeiro.html',
  '/my-fit-era.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nunca mexe em chamadas pro Supabase (ou qualquer domínio externo) —
  // essas sempre precisam de dados frescos da rede, nunca do cache.
  if (url.origin !== self.location.origin) return;
  if (request.method !== 'GET') return;

  // Navegação (abrir uma página/aba): tenta a rede primeiro (pra sempre
  // pegar a versão mais nova), cai pro cache só se estiver offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE_VERSION).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Arquivos estáticos (JS/CSS com hash no nome, ícones): cache primeiro,
  // já que uma build nova sempre gera nomes de arquivo diferentes.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          if (res && res.ok) caches.open(CACHE_VERSION).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => cached);
    })
  );
});
