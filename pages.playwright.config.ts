import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/pages',
  timeout: 60000,
  workers: 1,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: { baseURL: 'http://localhost:4201/hirehelper/', headless: true, trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/preview-pages.mjs',
    url: 'http://localhost:4201/hirehelper/',
    reuseExistingServer: true,
  },
});
