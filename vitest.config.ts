import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    passWithNoTests: true,
    // classify.ts transitively imports the neon client, which throws at import
    // time without a connection string; tests never open a real connection.
    env: { DATABASE_URL: 'postgres://test:test@localhost:5432/test' },
  },
});
