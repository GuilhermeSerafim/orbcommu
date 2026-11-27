import { test as base } from "@playwright/test"
import { banco } from "./banco"

// As suítes que usam o banco podem compartilhar o mesmo processo do Playwright.
export const test = base.extend<{}, { banco: typeof banco }>({
  banco: [async ({}, usar) => {
    try { await usar(banco) } finally { await banco.end() }
  }, { scope: "worker", auto: true }],
})
