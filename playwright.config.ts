import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testIgnore: '**/pages/**',
  timeout: 60000,
  expect: { timeout: 10000 },
  use: { baseURL: 'http://localhost:4200', trace: 'retain-on-failure' },
  workers: 1,
  reporter: 'list',
});
