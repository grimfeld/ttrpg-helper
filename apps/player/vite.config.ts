import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The Tauri shell loads this port in dev (src-tauri/tauri.conf.json, devUrl).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 5174, strictPort: true },
});
