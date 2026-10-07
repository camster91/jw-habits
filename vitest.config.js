import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 85, branches: 80, functions: 85, lines: 85,
        'src/domain/**': { statements: 95, branches: 90, functions: 95, lines: 95 },
        'src/domain/{store,migrateV1,notifications}.js': { statements: 95, branches: 90, lines: 95, perFile: true },
        'src/native/reminders.js': { statements: 85, branches: 85, lines: 85 },
        'src/utils/safeStorage.js': { statements: 80, branches: 70, lines: 85 },
        'src/utils/safeUrls.js': { statements: 85, branches: 80, lines: 90 },
      },
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.js',
        'scripts/',
      ],
    },
  },
});
