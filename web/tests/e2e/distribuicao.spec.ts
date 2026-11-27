import { expect, test } from "@playwright/test"

test("dezesseis vagas e uma pessoa aguardando", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto("/organizadores")
  const secao = page.getByRole("region", { name: "Como os grupos enchem?" })
  await expect(page.getByRole("heading", { name: "Como os grupos enchem?" })).toBeVisible()

  const conferirGrupos = async (ocupacao: number[]) => {
    const modos = secao.getByRole("article")
    await expect(modos).toHaveCount(3)
    for (const modo of await modos.all()) {
      const medidores = modo.getByRole("meter")
      await expect(medidores).toHaveCount(4)
      for (const [indice, vagas] of ocupacao.entries()) {
        await expect(medidores.nth(indice)).toHaveAttribute("aria-valuenow", String(vagas))
        await expect(medidores.nth(indice)).toHaveAttribute("aria-valuemax", "5")
      }
    }
  }

  await conferirGrupos([3, 1, 0, 0])
  const avancar = secao.getByRole("button", { name: "Avançar uma pessoa" })
  for (let chegada = 0; chegada < 16; chegada++) await avancar.press("Enter")
  await conferirGrupos([5, 5, 5, 5])
  await avancar.press("Enter")
  await expect(secao.getByRole("status")).toHaveText("Grupos lotados · 1 pessoa aguardando")
  await conferirGrupos([5, 5, 5, 5])
  await secao.getByRole("button", { name: "Recomeçar" }).press("Enter")
  await conferirGrupos([3, 1, 0, 0])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("a pausa manual continua ao sair da seção e voltar", async ({ page }) => {
  await page.clock.install()
  await page.setViewportSize({ width: 1440, height: 500 })
  await page.goto("/organizadores")
  const secao = page.getByRole("region", { name: "Como os grupos enchem?" })
  const pausa = secao.getByRole("button", { name: "Pausar", exact: true })
  await pausa.click()
  const status = secao.getByRole("status")
  const inicial = await status.innerText()

  await page.locator("#inicio").scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(secao).not.toBeInViewport()
  await page.clock.runFor(3600)
  await expect(status).toHaveText(inicial)

  const continuar = secao.getByRole("button", { name: "Continuar", exact: true })
  await continuar.scrollIntoViewIfNeeded()
  await expect(secao).toBeInViewport()
  await page.clock.runFor(3600)
  await expect(status).toHaveText(inicial)

  await continuar.click()
  await page.clock.runFor(2400)
  await expect(status).not.toHaveText(inicial)
})
