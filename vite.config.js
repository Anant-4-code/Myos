import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/data': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  root: '.',
  publicDir: 'public', // Even if it's empty, common for Vite
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        app: 'app.html',
        admin: 'admin.html',
      }
    }
  }
});
