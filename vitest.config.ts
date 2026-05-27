import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // convex-test bundles non-ESM helpers that Vite can't resolve from
    // `node_modules` at runtime; inlining the package fixes the resolution.
    server: { deps: { inline: ["convex-test"] } },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
