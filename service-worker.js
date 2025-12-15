self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("diary-cache").then(c =>
      c.addAll([
        "./",
        "./index.html",
        "./style.css",
        "./app.js",
        "./db.js",
        "./csv.js"
      ])
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
