import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { store } from "./store/store";
import "./index.css";

void store.init();

// Offline support (production builds only, so the dev server always serves fresh code).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("Service worker registration failed", e));
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
