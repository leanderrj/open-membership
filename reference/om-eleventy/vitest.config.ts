import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: false,
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      // Support `import "./foo.js"` resolving to the matching `.ts` source
      // during test runs, the same way Wrangler resolves them at build time.
    },
  },
});
