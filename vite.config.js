import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/react.oasis/',

    plugins: [react()],

    root: '.',

    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },

    server: {
      port: 5173,
      host: '0.0.0.0',

      proxy: {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: false,
        },

        '/storage': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});