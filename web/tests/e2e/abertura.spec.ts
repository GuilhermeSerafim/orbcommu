import { expect, test, type Page } from "@playwright/test"

const intervalo = 1100

async function abrirComRelogio(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.clock.install({ time: new Date("2026-01-01T12:00:00Z") })
  await page.goto("/organizadores")
  await page.clock.pauseAt(new Date("2026-01-01T13:00:00Z"))
  await page.emulateMedia({ reducedMotion: "no-preference" })
  const cena = page.locator("#inicio [data-animada]")
  await expect(cena).toHaveAttribute("data-animada", "true")
  return cena
}

test("a abertura mostra a ocupação inicial dos três grupos no celular", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto("/organizadores")
  const abertura = page.locator("#inicio")
  for (const texto of ["Exemplo", "Fila", "Grupos"]) {
    await expect(abertura.getByText(texto, { exact: true })).toHaveCount(0)
  }
  await expect(abertura.getByText("1.284", { exact: true })).toBeVisible()
  await expect(abertura.getByText("Simulação de vagas", { exact: true })).toBeVisible()
  await expect(abertura.getByText("cliques no link", { exact: true })).toBeVisible()
  await expect(abertura.getByRole("meter")).toHaveCount(3)
  for (const [indice, ocupadas] of [20, 17, 0].entries()) {
    const grupo = abertura.getByRole("meter", { name: `Grupo ${indice + 1}`, exact: true })
    await expect(grupo).toBeVisible()
    await expect(grupo).toHaveAttribute("aria-valuenow", String(ocupadas))
    await expect(grupo).toHaveAttribute("aria-valuemax", "20")
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("o painel avança enquanto a abertura está visível e o movimento é permitido", async ({ page }) => {
  const cena = await abrirComRelogio(page)
  const abertura = page.locator("#inicio")
  const contador = abertura.getByText(/^1\.\d{3}$/, { exact: true })
  const antigosControles = abertura.getByRole("button", { name: /^(Pausar animação|Retomar animação|Avançar|Reiniciar)$/ })
  await expect(antigosControles).toHaveCount(0)
  await page.clock.runFor(3 * intervalo)
  await expect(contador).toHaveText("1.285")

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true })
    document.dispatchEvent(new Event("visibilitychange"))
  })
  await expect(cena).toHaveAttribute("data-animada", "false")
  await page.clock.runFor(3 * intervalo)
  await expect(contador).toHaveText("1.285")

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }))
  await expect(abertura).not.toBeInViewport()
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden")
    document.dispatchEvent(new Event("visibilitychange"))
  })
  await page.clock.runFor(3 * intervalo)
  await expect(contador).toHaveText("1.285")

  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }))
  await expect(abertura).toBeInViewport()
  await expect(cena).toHaveAttribute("data-animada", "false")
  await page.clock.runFor(3 * intervalo)
  await expect(contador).toHaveText("1.285")

  await page.emulateMedia({ reducedMotion: "no-preference" })
  await expect(cena).toHaveAttribute("data-animada", "true")
  await page.clock.runFor(3 * intervalo)
  await expect(contador).toHaveText("1.286")
})

test("as entradas confirmadas preenchem os grupos até a lotação", async ({ page }) => {
  await abrirComRelogio(page)
  const abertura = page.locator("#inicio")
  const grupo2 = abertura.getByRole("meter", { name: "Grupo 2", exact: true })
  const grupo3 = abertura.getByRole("meter", { name: "Grupo 3", exact: true })
  await page.clock.runFor(intervalo)
  await expect(abertura.getByText("Novo clique no link", { exact: true })).toBeVisible()
  await page.clock.runFor(intervalo)
  await expect(abertura.getByText("Novo pedido de entrada", { exact: true })).toBeVisible()
  await expect(grupo2).toHaveAttribute("aria-valuenow", "17")
  await page.clock.runFor(intervalo)
  await expect(abertura.getByText("Entrada confirmada no Grupo 2", { exact: true })).toBeVisible()
  await expect(grupo2).toHaveAttribute("aria-valuenow", "18")

  await page.clock.runFor(6 * intervalo)
  await expect(grupo2).toHaveAttribute("aria-valuenow", "20")
  await expect(grupo3).toHaveAttribute("aria-valuenow", "0")
  await page.clock.runFor(3 * intervalo)
  await expect(abertura.getByText("Entrada confirmada no Grupo 3", { exact: true })).toBeVisible()
  await expect(grupo3).toHaveAttribute("aria-valuenow", "1")

  await page.clock.runFor(19 * 3 * intervalo)
  for (const medidor of await abertura.getByRole("meter").all()) {
    await expect(medidor).toHaveAttribute("aria-valuenow", "20")
    await expect(medidor).toHaveAttribute("aria-valuetext", /lotado/i)
  }
  await expect(abertura.getByText("Grupos lotados. Os pedidos aguardam vaga.", { exact: true })).toBeVisible()
  const totalDeCliques = abertura.getByText("1.307", { exact: true })
  await expect(totalDeCliques).toBeVisible()
  await page.clock.runFor(3 * intervalo)
  await expect(totalDeCliques).toBeVisible()
})
