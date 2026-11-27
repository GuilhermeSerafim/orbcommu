import { expect, test } from "@playwright/test"
import { criarOperadores, fazerLogin } from "../support/operadores"

test("isola a leitura entre sessões", async ({ browser, page }) => {
  test.setTimeout(90_000)
  const contas = await criarOperadores()
  const vinculada = await browser.newPage()
  const recusada = await browser.newPage()
  try {
    await page.goto("/fila")
    await expect(page).toHaveURL(/\/entrar$/)
    await fazerLogin(vinculada, contas.primeira)
    await expect(vinculada.getByRole("heading", { name: "Fila de entrada" })).toBeVisible()
    await fazerLogin(recusada, contas.semVinculo)
    const tituloFila = recusada.getByRole("heading", { name: "Fila de entrada" })
    await expect(recusada.getByRole("heading", { name: "Acesso recusado" })).toBeVisible()
    await expect(tituloFila).toHaveCount(0)
    await vinculada.reload()
    await expect(vinculada.getByRole("heading", { name: "Fila de entrada" })).toBeVisible()
    await recusada.goto("/fila")
    await expect(recusada.getByRole("heading", { name: "Acesso recusado" })).toBeVisible()
    await expect(tituloFila).toHaveCount(0)
    await vinculada.getByRole("button", { name: "Sair" }).click()
    await expect(vinculada).toHaveURL(/\/entrar$/)
    await vinculada.goto("/fila")
    await expect(vinculada).toHaveURL(/\/entrar$/)
  } finally {
    await Promise.all([vinculada.close(), recusada.close()])
    await contas.limpar()
  }
})
