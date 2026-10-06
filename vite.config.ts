import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Port 8085, not the backend's usual 8080 — see Procfile.dev's comment
      // in the backend repo: 8080 is wedged by a Windows TCP-stack issue on
      // this dev machine until it's next rebooted. Move both back to 8080
      // together once that's happened.
      proxy: {
        '/api': {
          target: 'http://localhost:8085',
          changeOrigin: true,
        },
        '/health': {
          target: 'http://localhost:8085',
          changeOrigin: true,
        },
        '/info': {
          target: 'http://localhost:8085',
          changeOrigin: true,
        },
        '/version': {
          target: 'http://localhost:8085',
          changeOrigin: true,
        },
      },
    },
  };
});
