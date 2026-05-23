/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [wasm()],
  optimizeDeps: {
    include: ["canvaskit-wasm"],
  },
  test: {
    environment: "jsdom",
    clearMocks: true,
  },
});
