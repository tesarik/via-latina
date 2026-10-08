import { defineConfig } from "vitest/config";

// Quiz logic is pure (no DOM, no React), so tests run in plain Node.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
