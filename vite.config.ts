import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/pix': {
        target: 'https://app.ghostspaysv1.com',
        changeOrigin: true,
        rewrite: (path) => '/api/v1/transaction.purchase',
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Adicionar headers de autenticação
            proxyReq.setHeader('Authorization', 'c6b41266-2357-4a6c-8e07-aa3873690c1a');
            proxyReq.setHeader('X-Public-Key', '4307a311-e352-47cd-9d24-a3c05e90db0d');
            proxyReq.setHeader('Accept', 'application/json');
          });
        }
      },
      '/api/pix-status': {
        target: 'https://app.ghostspaysv1.com',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://localhost');
          return '/api/v1/transaction.getPayment' + url.search;
        },
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Adicionar headers de autenticação
            proxyReq.setHeader('Authorization', 'c6b41266-2357-4a6c-8e07-aa3873690c1a');
            proxyReq.setHeader('X-Public-Key', '4307a311-e352-47cd-9d24-a3c05e90db0d');
            proxyReq.setHeader('Accept', 'application/json');
          });
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});