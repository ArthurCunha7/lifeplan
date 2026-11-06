/* LifePlan — service worker. Só recebe push e abre o app ao tocar no aviso.
   Não guarda nada em cache (assim uma versão nova do app nunca fica "presa"). */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { d = { title: 'LifePlan', body: event.data ? event.data.text() : '' }; }

  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Avisa o app aberto para atualizar o sino na hora
    wins.forEach((w) => w.postMessage({ lifeplanPush: true, id: d.id }));
    // Com o app visível na tela, o sino já mostra o aviso: não repete no sistema
    if (wins.some((w) => w.visibilityState === 'visible')) return;
    await self.registration.showNotification(d.title || 'LifePlan', {
      body: d.body || '',
      tag: d.tag || 'lifeplan',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: d.url || '/' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) { await w.focus(); w.postMessage({ lifeplanOpenNotifications: true }); return; }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
