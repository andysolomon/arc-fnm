import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

function arcSimCoreEntry(): string {
  const sibling = fileURLToPath(
    new URL('../arc-sim/src/index.ts', import.meta.url),
  );
  const vendor = fileURLToPath(
    new URL('./vendor/arc-sim/src/index.ts', import.meta.url),
  );
  if (existsSync(sibling)) return sibling;
  if (existsSync(vendor)) return vendor;
  throw new Error(
    'Missing @arc-sim/core source. Clone https://github.com/andysolomon/arc-sim next to this repo, or run `node scripts/ensure-arc-sim.mjs`.',
  );
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@arc-sim/core': arcSimCoreEntry(),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 15_000,
  },
});
