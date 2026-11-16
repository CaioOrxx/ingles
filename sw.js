/* Guarda o app no aparelho para funcionar sem internet.
   Ao mudar o app, troque a versão abaixo para forçar a atualização. */
const VERSION = "ingles-v4";
const FILES = ["./", "./index.html", "./style.css", "./app.js", "./data.js", "./manifest.webmanifest",
  "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Usa a cópia guardada na hora (rápido e offline) e busca a versão nova em segundo plano,
// sempre conferindo com o servidor (sem usar a memória do navegador).
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req, { cache: "no-cache" }).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || cache.match("./index.html");
  }));
});
