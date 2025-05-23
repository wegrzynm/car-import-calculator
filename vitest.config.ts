/// <reference types="vitest" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom', // or 'jsdom'
    include: ['src/tests/unit/**/*.spec.ts'],
    setupFiles: ['src/tests/unit/setup.ts'], // Optional: if we need global setup
    coverage: {
      provider: 'c8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
    },
  },
});
