import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
const plugins = [react(), tailwindcss()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // NOTE: manualChunks removed. The previous function-based split put
        // "icons-vendor" (lucide-react) and "react-vendor" in different chunks,
        // while the generic "vendor" catch-all ended up depending on BOTH of
        // them — creating a real circular chunk dependency:
        //   icons-vendor -> react-vendor -> vendor -> icons-vendor
        // With ESM circular imports, whichever chunk closes the cycle can
        // execute before its dependency has finished initializing, which is
        // exactly what caused "Cannot read properties of undefined
        // (reading 'forwardRef')" in icons-vendor at runtime (confirmed by
        // rebuilding this exact commit and tracing the chunk import graph).
        // Letting Rollup's automatic chunking handle this avoids the cycle.
        // If you want manual vendor splitting back for cache/perf reasons,
        // make sure nothing outside "react-vendor" is allowed to be a
        // dependency of "react-vendor" (no back-edges into it).
      },
    },
  },
  server: {
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
