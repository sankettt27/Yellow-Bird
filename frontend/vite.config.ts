import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Custom plugin to serve admin.html for /admin/* routes in dev mode.
 * Without this, Vite only serves index.html as the SPA fallback.
 */
function multiPagePlugin(): Plugin {
  return {
    name: 'multi-page-spa',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        // Rewrite /admin/* requests to serve admin.html (except for static assets)
        if (req.url && req.url.startsWith('/admin') && !req.url.includes('.')) {
          req.url = '/admin.html';
        }
        next();
      });
    },
  };
}

import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    multiPagePlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
      },
    },
  },
  server: {
    port: 5173,
    host: true, // Listen on all local IPs
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
