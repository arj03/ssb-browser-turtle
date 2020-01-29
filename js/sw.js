var currentCache = ""

self.addEventListener('message', function (evt) {
  currentCache = evt.data
})

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.open(currentCache).then(function(cache) {
      return cache.match(event.request).then(function(response) {
        if (response) return response

        // not in cache, try to fetch it from the network
        return fetch(event.request).then(function(networkResponse) {
          return networkResponse;
        })
      })
    })
  )
})

self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting()) // Activate worker immediately
})

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim()) // Become available to all pages
})
