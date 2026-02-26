import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env / .env.production etc. for the current mode
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  return {
    plugins: [react()],

    // ── Path aliases ─────────────────────────────────────────
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    // ── Development server ───────────────────────────────────
    server: {
      port: 3000,
      strictPort: true,
      // Proxy API & Socket.io to Express in dev
      // (avoids CORS issues during local development)
      proxy: {
        '/api': {
          target: env.VITE_SERVER_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
        '/uploads': {
          target: env.VITE_SERVER_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: env.VITE_SERVER_URL || 'http://localhost:5000',
          changeOrigin: true,
          ws: true,
        },
      },
    },

    // ── Production build ─────────────────────────────────────
    build: {
      // Output to dist/ (default, but explicit for clarity)
      outDir: 'dist',

      // Increase warning threshold (bundled deps are expected to be large)
      chunkSizeWarningLimit: 600,

      // Source maps in production help with error monitoring (Sentry, etc.)
      // Set to false if you prefer to keep source hidden
      sourcemap: !isProd,

      // Rollup options for optimised chunking
      rollupOptions: {
        output: {
          // Split vendor libraries into separate chunks for better caching
          manualChunks: {
            // React core — changes rarely, long cache TTL
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Socket.io client
            'vendor-socket': ['socket.io-client'],
            // HTTP client
            'vendor-axios': ['axios'],
          },
        },
      },

      // Minification (esbuild is the Vite default, fast + effective)
      minify: isProd ? 'esbuild' : false,

      // Target modern browsers only (reduces bundle size)
      target: ['es2020', 'chrome87', 'firefox78', 'safari14'],
    },

    // ── Preview server (serves dist/ for smoke tests) ────────
    preview: {
      port: 4173,
      strictPort: true,
    },
  };
});
