/* Service worker mínimo — habilita a instalação como PWA (kiosk de recepção)
   e serve o app offline depois da 1ª visita. Cache "stale-while-revalidate":
   entrega rápido do cache e atualiza em segundo plano. Bump a versão para
   forçar atualização. */
const CACHE = 'constelacao-v1'
const CORE = ['.', 'index.html', 'equipe.json', 'manifest.webmanifest', 'icon.svg', 'og.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok && request.url.startsWith(self.location.origin)) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
