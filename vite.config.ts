import process from 'node:process';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import yaml from '@modyfi/vite-plugin-yaml';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.PATH_PREFIX ? `${process.env.PATH_PREFIX}/` : '/',
  plugins: [react(), tailwindcss(), yaml()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@config': path.resolve(__dirname, 'config.yml'),
    },
  },
  define: {
    'import.meta.env.VERCEL': JSON.stringify(process.env.VERCEL),
  },
  build: {
    manifest: true,
    outDir: './dist',
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules')) {
            return 'vendors';
          }
          if (id.includes('activities.json')) {
            return 'activities';
          }
        },
      },
    },
  },
});
