import { defineConfig } from "vite";

// Feature 001-core-loop: plain Vite + Phaser + TS, no framework glue needed yet.
export default defineConfig({
  base: "./",
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
});
