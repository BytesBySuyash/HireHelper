import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/pages',
  timeout: 60000,
  workers: 1,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: { baseURL: 'http://localhost:4202/', headless: true, trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/preview-pages.mjs --vercel',
    url: 'http://localhost:4202/',
    reuseExistingServer: true,
  },
});
