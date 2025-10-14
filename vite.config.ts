import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Allow external connections
    port: 5173,
    watch: {
      usePolling: true, // Enable polling for Docker
      interval: 1000, // Poll every 1 second
    },
    hmr: {
      port: 5173, // HMR port
      host: "localhost", // HMR host for external access
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
}));
