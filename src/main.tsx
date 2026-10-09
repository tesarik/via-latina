import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Bundled with the app (no Google Fonts request) so it also works offline.
import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/500.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource/atkinson-hyperlegible-next/700-italic.css";
import "@fontsource/atkinson-hyperlegible-next/800.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
