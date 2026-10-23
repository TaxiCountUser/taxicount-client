// Fins al 2026-10-24 l'app web de client vivia a l'arrel de www.taxicount.com i hi registrava
// aquest service worker (Flutter). Ara l'app és a /app/ i l'arrel és la landing. Aquest fitxer
// substitueix l'antic amb el mateix nom: s'instal·la, buida les caches de l'app antiga, es
// desregistra i recarrega les pestanyes obertes perquè vegin la landing. Es pot esborrar al cap
// d'uns mesos.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
