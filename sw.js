const CACHE_NAME = 'rodeur-v4';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.json'
];

// Installation : on met en cache les fichiers de base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Nettoyage des vieux caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
});

// Stratégie "Cache First" avec mise en cache dynamique des images/audio
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Si le fichier est déjà dans le cache, on le donne sans utiliser Internet
      if (response) return response;
      
      // Sinon, on va le chercher sur Internet...
      return fetch(event.request).then(networkResponse => {
        // ...et on le sauvegarde secrètement dans le cache pour la prochaine fois !
        if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        let responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    }).catch(() => {
      console.log("Mode hors-ligne absolu : requête échouée.");
    })
  );
});