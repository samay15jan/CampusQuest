if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
      })
      .then((registration) => {
        console.log(
          "Campus Quest service worker registered:",
          registration.scope
        );
      })
      .catch((error) => {
        console.error(
          "Campus Quest service worker registration failed:",
          error
        );
      });
  });
}