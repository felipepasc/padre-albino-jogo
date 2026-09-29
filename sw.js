/* Kill-switch.
   Ate 28/09/2026 o PWA morava na raiz deste site e registrou um service worker
   com escopo "/padre-albino-jogo/". O jogo mudou para "/padre-albino-jogo/jogo/",
   entao este arquivo existe so para desfazer aquele registro antigo em quem ja
   tinha visitado. Apaga apenas os caches do formato antigo (mpa-<hash>) — o cache
   novo se chama mpa-jogo-<hash> e fica intacto. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => /^mpa-[0-9a-f]{10}$/.test(k)).map(k => caches.delete(k))
    );
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    for (const w of windows) w.navigate(w.url).catch(() => {});
  })());
});
