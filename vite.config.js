import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const apiUrl = new URL(env.VITE_API_URL);
  const apiOrigin = apiUrl.origin;        // https://360.era-solutions.com
  const apiBasePath = apiUrl.pathname;    // /api.animals/public

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
          target: apiOrigin,                                        // https://360.era-solutions.com
          changeOrigin: true,
          secure: false,
          rewrite: (path) => `${apiBasePath}${path}`,              // /api.animals/public/storage/...
        },
      },
    },
  };
});