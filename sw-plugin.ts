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
          if (item === "sw.js" || item === "index.html") continue;
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

      const staticUrls = files.map((f) => `${base}${f}`);

      const hash = crypto
        .createHash("sha256")
        .update([base, ...staticUrls].sort().join(","))
        .digest("hex")
        .slice(0, 8);

      const cacheName = `caln-${hash}`;

      const swContent = `const CACHE_NAME = ${JSON.stringify(cacheName)};
const BASE = ${JSON.stringify(base)};
const STATIC_ASSETS = ${JSON.stringify(staticUrls, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const shell = await fetch(BASE, { cache: "reload" });
        if (shell.ok) {
          await cache.put(BASE, shell.clone());
          await cache.put(BASE + "index.html", shell);
        }
      } catch (err) {
        console.error("SW shell precache error:", err);
      }
      return Promise.allSettled(
        STATIC_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) {
              await cache.put(url, res);
            }
          } catch (err) {
            console.error("SW asset precache error:", url, err);
          }
        })
      );
    })
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
      caches.match(BASE).then((cached) => {
        if (cached) return cached;
        return caches.match(BASE + "index.html").then((cachedHtml) => {
          if (cachedHtml) return cachedHtml;
          return fetch(req).catch(() => caches.match(BASE));
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => {
          return new Response("Offline", { status: 503, statusText: "Offline" });
        });
    })
  );
});
`;

      fs.writeFileSync(path.join(fullOutDir, "sw.js"), swContent, "utf8");
    },
  };
}
