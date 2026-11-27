import { expect, test } from "@playwright/test"

test.use({ javaScriptEnabled: false })

test("explica como enviar sem expor o pedido na URL quando o JavaScript está desativado", async ({ page }) => {
  await page.goto("/")
  const enviar = page.getByRole("button", { name: "Enviar pedido" })
  await expect(enviar).toBeDisabled()
  const aviso = page.locator("noscript p")
  await expect(aviso).toBeVisible()
  await expect(aviso).toHaveText("Ative o JavaScript no navegador e recarregue esta página para enviar seu pedido.")
  await expect(page.locator("form")).toHaveAttribute("method", "post")

  const urlInicial = page.url()
  const navegacoes: string[] = []
  page.on("request", pedido => {
    if (pedido.isNavigationRequest()) navegacoes.push(pedido.url())
  })
  await page.getByLabel("Como você quer ser chamado?").fill("Pessoa fictícia")
  const telefone = page.getByLabel("WhatsApp com DDD")
  await telefone.fill("11900000000")
  await page.getByLabel("O que você busca na Meet Up Tech SP?").fill("Motivação fictícia")
  await telefone.press("Enter")
  await expect(page).toHaveURL(urlInicial)
  expect(navegacoes).toEqual([])
})
