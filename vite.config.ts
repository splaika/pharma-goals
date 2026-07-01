import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Power Apps Code Apps serve assets from a relative path, so base MUST be "./".
// The dev server port is referenced by `power-apps init` (Local Play URL).
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 3000,
    host: "::",
  },
  build: {
    outDir: "dist",
  },
});
