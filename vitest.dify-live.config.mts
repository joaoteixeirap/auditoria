import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/live/dify.test.ts"],
    setupFiles: ["src/test-setup.ts"],
    testTimeout: 100000,
    disableConsoleIntercept: true,
  },
});
