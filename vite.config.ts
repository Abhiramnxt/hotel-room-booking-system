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
    build: {
      // Target modern browsers for smaller, faster output
      target: 'es2020',
      // Raise warning threshold — large dashboards are expected in this app
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Split vendor libraries into separate cached chunks so the main
          // app bundle isn't re-downloaded when only app code changes.
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion'],
            'vendor-lucide': ['lucide-react'],
            'vendor-pdf': ['jspdf'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Ignore database and PDF files to prevent server triggers reloading the browser.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/mock_mysql_data.json', '**/*.pdf'],
      },
    },
  };
});
