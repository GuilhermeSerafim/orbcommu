import { defineConfig } from "@playwright/test"
import "./tests/support/banco"

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:4174", viewport: { width: 390, height: 844 } },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174",
  },
})
