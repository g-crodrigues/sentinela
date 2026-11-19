/* Sentinela — serviço de segundo plano.
   Guarda a aplicação para abrir sem rede. As notícias em si ficam
   no armazenamento local do browser, não aqui.                      */
const VERSAO = "sentinela-v3";
const CASCA = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCA)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if(e.request.method !== "GET" || url.origin !== location.origin) return;   // as notícias vêm de fora

  // A aplicação: rede primeiro, para receber actualizações; cache se falhar.
  // Cada página fica guardada com o seu nome: index.html e tecnica.html não se trocam.
  if(e.request.mode === "navigate"){
    const nome = /\/$/.test(url.pathname) ? "./index.html" : "." + url.pathname.slice(url.pathname.lastIndexOf("/"));
    e.respondWith(
      fetch(e.request).then(r => {
        if(r.ok){ const copia = r.clone(); caches.open(VERSAO).then(c => c.put(nome, copia)); }
        return r;
      }).catch(() => caches.match(nome).then(r => r || caches.match("./index.html"))));
    return;
  }
  // Ícones e manifesto: cache primeiro.
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
