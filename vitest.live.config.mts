import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/live/gemini.test.ts"],
    setupFiles: ["src/test-setup.ts"],
    testTimeout: 165000,
    disableConsoleIntercept: true,
  },
});
