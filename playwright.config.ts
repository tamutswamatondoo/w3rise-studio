import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const installedBrowser = [
  process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((path): path is string => !!path && existsSync(path));

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    acceptDownloads: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: installedBrowser ? { executablePath: installedBrowser } : {},
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173/api/config',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
});
