import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-20T12:00:00Z") })
  await page.clock.pauseAt(new Date("2026-11-20T12:01:00Z"))
})

test("dezesseis vagas e uma pessoa aguardando", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto("/organizadores")
  const secao = page.getByRole("region", { name: "Como os grupos enchem?" })
  await expect(page.getByRole("heading", { name: "Como os grupos enchem?" })).toBeVisible()
  const legenda = secao.getByRole("list", { name: "Legenda de ocupação" })
  await expect(legenda).toBeVisible()
  await expect(legenda.getByRole("listitem")).toHaveText(["Livre", "Médio", "Lotado"])

  const conferirGrupos = async (ocupacao: number[]) => {
    const modos = secao.getByRole("article")
    await expect(modos).toHaveCount(3)
    for (const modo of await modos.all()) {
      const medidores = modo.getByRole("meter")
      await expect(medidores).toHaveCount(4)
      for (const [indice, vagas] of ocupacao.entries()) {
        const medidor = medidores.nth(indice)
        await expect(medidor).toHaveAttribute("aria-valuenow", String(vagas))
        await expect(medidor).toHaveAttribute("aria-valuemax", "5")
        const estado = ["Livre", "Livre", "Livre", "Livre", "Médio", "Lotado"][vagas]
        await expect(medidor).toHaveAttribute("aria-valuetext", new RegExp(estado))
      }
    }
  }

  await conferirGrupos([3, 1, 0, 0])
  const sequencia = secao.getByRole("article").filter({ has: page.getByRole("heading", { name: "Em sequência" }) })
  const grupoA = sequencia.getByRole("meter", { name: "Grupo A", exact: true })
  const preenchimento = grupoA.locator("i")
  await expect(preenchimento).toHaveCount(1)
  await expect(preenchimento).toBeVisible()
  await expect(preenchimento).toHaveCSS("background-color", "rgb(37, 211, 102)")
  await grupoA.scrollIntoViewIfNeeded()
  await expect.poll(async () => {
    await page.clock.runFor(200)
    return grupoA.getAttribute("aria-valuenow")
  }, { intervals: [50] }).toBe("4")
  await expect(secao.getByText("Chegadas simuladas · 1", { exact: true })).toBeVisible()
  await expect(grupoA).toHaveAttribute("aria-valuetext", /Médio/i)
  await expect(preenchimento).toHaveCSS("background-color", "rgb(233, 162, 59)")
  await page.clock.runFor(1200)
  await expect(grupoA).toHaveAttribute("aria-valuenow", "5")
  await expect(grupoA).toHaveAttribute("aria-valuetext", /Lotado/i)
  await expect(preenchimento).toHaveCSS("background-color", "rgb(229, 87, 75)")

  await page.clock.runFor(14 * 1200)
  await conferirGrupos([5, 5, 5, 5])
  await page.clock.runFor(1200)
  await expect(secao.getByRole("status")).toHaveText("Grupos lotados · 1 pessoa aguardando")
  await page.clock.runFor(5 * 1200)
  await expect(secao.getByRole("status")).toHaveText("Grupos lotados · 1 pessoa aguardando")
  await conferirGrupos([5, 5, 5, 5])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("o avanço respeita o movimento reduzido e a visibilidade da seção", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.setViewportSize({ width: 1440, height: 500 })
  await page.goto("/organizadores")
  const secao = page.getByRole("region", { name: "Como os grupos enchem?" })
  await secao.scrollIntoViewIfNeeded()
  const fimDoTitulo = await secao.getByRole("heading", { level: 2 }).evaluate(titulo => titulo.getBoundingClientRect().right)
  const modos = secao.getByRole("article")
  await expect(modos).toHaveCount(3)
  for (const modo of await modos.all()) {
    expect(await modo.evaluate(artigo => artigo.getBoundingClientRect().left)).toBeGreaterThanOrEqual(fimDoTitulo)
    const inicioDaDescricao = await modo.locator("p").evaluate(descricao => descricao.getBoundingClientRect().left)
    const medidores = modo.getByRole("meter")
    await expect(medidores).toHaveCount(4)
    const fimDosMedidores = await medidores.evaluateAll(barras => Math.max(...barras.map(barra => barra.getBoundingClientRect().right)))
    expect(fimDosMedidores).toBeLessThanOrEqual(inicioDaDescricao)
  }
  const contagem = secao.locator("b").filter({ hasText: /^(Simulação · 4 vagas já ocupadas|Chegadas simuladas · \d+)$/ })
  const inicial = await contagem.innerText()
  await page.clock.runFor(3600)
  await expect(contagem).toHaveText(inicial)

  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.clock.runFor(2400)
  await expect(contagem).not.toHaveText(inicial)
  await page.locator("#inicio").scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(secao).not.toBeInViewport()
  const antesDeSair = await contagem.innerText()
  await page.clock.runFor(3600)
  await expect(contagem).toHaveText(antesDeSair)

  await secao.scrollIntoViewIfNeeded()
  await expect(secao).toBeInViewport()
  await page.clock.runFor(2400)
  await expect(contagem).not.toHaveText(antesDeSair)
  await expect(secao.getByRole("status")).toBeEmpty()
})
