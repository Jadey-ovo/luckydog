import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/web',
  use: { baseURL: process.env.WEB_TEST_URL || 'http://127.0.0.1:4173', viewport: { width: 1280, height: 900 } },
  webServer: process.env.WEB_TEST_URL ? undefined : { command: 'node scripts/web-test-server.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 120000 },
});
