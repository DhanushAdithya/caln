import { render } from "preact";
import "./index.css";
import { App } from "./app.tsx";
import { initStore, showToast } from "./state/store";

initStore().finally(() => {
  render(<App />, document.getElementById("app")!);
});

if ("serviceWorker" in navigator && !import.meta.env.DEV) {
  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        function promptUpdate(worker: ServiceWorker) {
          showToast(
            "Update ready",
            {
              label: "Reload",
              onClick: () => {
                worker.postMessage("skipWaiting");
                window.location.reload();
              },
            },
            10000,
          );
        }

        if (reg.waiting) {
          promptUpdate(reg.waiting);
          return;
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              promptUpdate(newWorker);
            }
          });
        });
      })
      .catch((err) => {
        console.error("SW registration failed:", err);
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}
