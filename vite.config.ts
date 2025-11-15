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
    proxy: {
      '/sitemap.xml': {
        // In Docker, use service name 'server', otherwise use localhost
        // Check multiple ways to detect Docker environment
        target: (process.env.DOCKER_ENV === 'true' || 
                 process.env.VITE_API_URL?.includes('server') ||
                 process.env.CHOKIDAR_USEPOLLING === 'true')
          ? 'http://server:3001'
          : (process.env.VITE_API_URL?.replace(/\/api.*$/, '') || 'http://localhost:3001'),
        changeOrigin: true,
      },
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks to reduce initial bundle size
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          'query-vendor': ['@tanstack/react-query'],
          'paypal-vendor': ['@paypal/react-paypal-js'],
        },
      },
    },
    // Increase chunk size warning limit for better code splitting
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    // Pre-bundle dependencies to reduce initial load
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
    // Exclude heavy dependencies from pre-bundling (load on demand)
    exclude: [
      '@paypal/react-paypal-js', // Load PayPal only when needed
    ],
  },
}));
