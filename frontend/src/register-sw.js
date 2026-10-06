// Register the service worker in production builds only.
// (In dev it would cache stale modules and break hot reload.)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error) => console.error("Service worker registration failed:", error));
  });
}
