'use strict';

// Basic service worker for PWA offline capability (cache-first strategy for static assets)
const CACHE_NAME = 'pariaza-inteligent-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  // Add other static assets like JS/CSS bundles if not using CDN, or specific CDN links you want to cache
  // Be careful with caching external CDN resources as they might update
  // 'https://cdn.tailwindcss.com', // Example: Caching Tailwind, though CDN caching can be tricky
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          fetchResponse => {
            // Check if we received a valid response
            if(!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic' && fetchResponse.type !== 'cors') {
              return fetchResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = fetchResponse.clone();

            // Don't cache API calls or dynamic content in this basic setup
            // This regex is an example, adjust it to your API endpoints
            if (event.request.url.includes('/api/') || event.request.url.startsWith('https://raw.githubusercontent.com')) {
                 return fetchResponse;
            }


            caches.open(CACHE_NAME)
              .then(cache => {
                // Do not cache post requests, or other non-GET requests
                if (event.request.method === 'GET') {
                     cache.put(event.request, responseToCache);
                }
              });

            return fetchResponse;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
});