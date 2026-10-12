import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';
export function launchBrowser() {
  const executablePath = [process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].find(p => p && existsSync(p));
  return chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
}
