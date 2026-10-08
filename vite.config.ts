import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    // Sub-path for static hosting (e.g. BASE_PATH=/via-latina/ for GitHub Pages).
    base: env.BASE_PATH || "/",
    plugins: [react()],
  };
});
