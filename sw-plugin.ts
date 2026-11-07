import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Plugin, ResolvedConfig } from "vite";

export function swPlugin(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "sw-plugin",
    apply: "build",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    closeBundle() {
      const outDir = config.build.outDir || "dist";
      const fullOutDir = path.resolve(config.root, outDir);
      if (!fs.existsSync(fullOutDir)) return;

      const base = config.base.endsWith("/") ? config.base : `${config.base}/`;

      const files: string[] = [];
      function walk(dir: string, rel = "") {
        for (const item of fs.readdirSync(dir)) {
          if (item === "sw.js") continue;
          const fullPath = path.join(dir, item);
          const relPath = rel ? `${rel}/${item}` : item;
          if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath, relPath);
          } else {
            files.push(relPath);
          }
        }
      }
      walk(fullOutDir);

      const precacheUrls = Array.from(
        new Set([
          base,
          `${base}index.html`,
          ...files.map((f) => `${base}${f}`),
        ]),
      );

      const hash = crypto
        .createHash("sha256")
        .update(precacheUrls.sort().join(","))
        .digest("hex")
        .slice(0, 8);

      const cacheName = `caln-${hash}`;

      const swContent = `const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE = ${JSON.stringify(precacheUrls, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("${base}index.html").then((cached) => cached || fetch(req)),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      });
    }),
  );
});
`;

      fs.writeFileSync(path.join(fullOutDir, "sw.js"), swContent, "utf8");
    },
  };
}
