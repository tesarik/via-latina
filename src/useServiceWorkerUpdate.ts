import { useCallback, useEffect, useRef, useState } from "react";

// Registers the service worker (production only) and detects when a newer build
// has installed and is waiting. The new worker no longer calls skipWaiting on
// its own (see public/sw.js) — instead the app shows an "update available"
// prompt and, on accept, posts SKIP_WAITING; when the new worker takes control
// the `controllerchange` handler reloads once so the fresh assets are used.
export function useServiceWorkerUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const waiting = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;

    // Whether a worker already controls this page. On the very first visit there
    // is none, and the initial `clients.claim()` fires `controllerchange` — we
    // must NOT reload in that case (it would be a spurious first-load refresh).
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;

    const promote = (worker: ServiceWorker | null) => {
      if (!worker) return;
      waiting.current = worker;
      setUpdateReady(true);
    };

    const register = () => {
      const base = import.meta.env.BASE_URL;
      navigator.serviceWorker
        .register(base + "sw.js", { scope: base })
        .then((reg) => {
          // Hand the worker everything this page already loaded so it can cache it.
          navigator.serviceWorker.ready.then((ready) => {
            const urls = [location.href, ...performance.getEntriesByType("resource").map((e) => e.name)];
            ready.active?.postMessage({ type: "CACHE_URLS", urls });
          });
          if (reg.waiting && navigator.serviceWorker.controller) promote(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              // A new worker finished installing while an old one still controls
              // the page → a genuine update is ready to offer.
              if (nw.state === "installed" && navigator.serviceWorker.controller) promote(nw);
            });
          });
        })
        .catch(() => {});
    };

    const onControllerChange = () => {
      if (reloaded || !hadController) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("load", register);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    waiting.current?.postMessage({ type: "SKIP_WAITING" });
  }, []);

  const dismissUpdate = useCallback(() => setUpdateReady(false), []);

  return { updateReady, applyUpdate, dismissUpdate };
}
