import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Stamps `__SW_VERSION__` in dist/sw.js with `<pkg.version>-<build-id>` so each
// production build gets its own Cache Storage bucket and stale assets are
// dropped when the new worker activates.
function swVersion(): Plugin {
  return {
    name: "sw-version",
    apply: "build",
    writeBundle(options) {
      const swPath = path.join(options.dir ?? "dist", "sw.js");
      if (!fs.existsSync(swPath)) return;
      const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8")) as { version: string };
      const version = `${pkg.version}-${Date.now().toString(36)}`;
      fs.writeFileSync(swPath, fs.readFileSync(swPath, "utf-8").replace(/__SW_VERSION__/g, version));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    // Sub-path for static hosting, e.g. BASE_PATH=/via-latina/ (see `npm run build:web`).
    base: env.BASE_PATH || "/",
    plugins: [react(), swVersion()],
  };
});
