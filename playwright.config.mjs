import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  },
  webServer: {
    command: 'python -m http.server 4173 --bind 127.0.0.1 --directory docs/prototipos',
    url: 'http://127.0.0.1:4173/participante/index.html',
    reuseExistingServer: false,
  },
});
