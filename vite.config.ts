/// <reference types="vitest" />

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
   
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  optimizeDeps: {
    exclude: ['realm'], // Ensure realm is optimized
    include: ['cropperjs'],
  },
  build: {
  
    commonjsOptions: {
      esmExternals: true 
   },
  },
});
