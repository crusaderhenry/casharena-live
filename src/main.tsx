import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA with update detection
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[SW] Registered:", registration.scope);

        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update().catch(console.error);
        }, 60 * 1000);

        // Listen for new service worker installation
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("[SW] Update found, installing...");

          newWorker?.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                // New version available - notify the UI
                console.log("[SW] New version installed, ready to activate");
                window.dispatchEvent(new CustomEvent("sw-update-available"));
              } else {
                // First install
                console.log("[SW] First install complete");
              }
            }
          });
        });

        // Handle controller change (new SW took over)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("[SW] Controller changed, reloading for fresh content");
        });
      })
      .catch((error) => {
        console.log("[SW] Registration failed:", error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
