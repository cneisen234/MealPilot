const CACHE_NAME = "mealpilot-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/static/css/main.css",
  "/static/js/main.js",
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.clients.claim();
});
