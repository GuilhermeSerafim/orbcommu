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

test("convidar não ocupa vaga antes da confirmação da equipe", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto("/organizadores")
  await expect(page.getByText("1.284", { exact: true })).toBeVisible()
  for (const [index, ocupadas] of [20, 17, 0].entries()) {
    const grupo = page.getByRole("meter", { name: `Grupo ${index + 1}` })
    await expect(grupo).toHaveAttribute("aria-valuenow", String(ocupadas))
    await expect(grupo).toHaveAttribute("aria-valuemax", "20")
  }

  const fila = page.getByRole("button", { name: "Fila", exact: true })
  const grupos = page.getByRole("button", { name: "Grupos", exact: true })
  const grupo2 = page.getByRole("meter", { name: "Grupo 2" })
  await fila.press("Enter")
  for (const [acao, estado] of [
    ["Aprovar Ana", "Aguardando vaga"],
    ["Chamar Ana", "Envio a confirmar"],
    ["Confirmar envio", "Convite enviado"],
  ]) {
    await page.getByRole("button", { name: acao, exact: true }).press("Enter")
    await expect(page.getByRole("status").filter({ hasText: estado })).toBeVisible()
  }
  await grupos.press("Enter")
  await expect(grupo2).toHaveAttribute("aria-valuenow", "17")
  await fila.press("Enter")
  await page.getByRole("button", { name: "Confirmar entrada", exact: true }).press("Enter")
  await expect(page.getByRole("status").filter({ hasText: "Entrada confirmada" })).toBeVisible()
  await grupos.press("Enter")
  await expect(grupo2).toHaveAttribute("aria-valuenow", "18")
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

test("a entrada seguinte ao grupo cheio ocupa o próximo grupo", async ({ page }) => {
  await abrirComRelogio(page)
  const grupo2 = page.getByRole("meter", { name: "Grupo 2" })
  const grupo3 = page.getByRole("meter", { name: "Grupo 3" })
  await page.clock.runFor(9 * intervalo)
  await expect(grupo2).toHaveAttribute("aria-valuenow", "20")
  await expect(grupo3).toHaveAttribute("aria-valuenow", "0")
  await page.clock.runFor(3 * intervalo)
  await expect(grupo2).toHaveAttribute("aria-valuenow", "20")
  await expect(grupo3).toHaveAttribute("aria-valuenow", "1")
})

test("pedidos recentes e suas confirmações aparecem na Fila automaticamente", async ({ page }) => {
  await abrirComRelogio(page)
  await page.getByRole("button", { name: "Fila", exact: true }).press("Enter")
  await page.clock.runFor(3 * intervalo)
  const recentes = page.getByRole("list", { name: "Pedidos recentes" })
  await expect(recentes.getByRole("listitem").filter({ hasText: "Pedido 1" })).toContainText("Entrada confirmada")
  await page.clock.runFor(2 * intervalo)
  const segundo = recentes.getByRole("listitem").filter({ hasText: "Pedido 2" })
  await expect(segundo).toContainText("Para analisar")
  await page.clock.runFor(intervalo)
  await expect(segundo).toContainText("Entrada confirmada")
  await expect(page.getByRole("button", { name: "Aprovar Ana" })).toBeVisible()
  await page.getByRole("button", { name: "Grupos", exact: true }).press("Enter")
  await expect(page.getByRole("meter", { name: "Grupo 2" })).toHaveAttribute("aria-valuenow", "19")
})

test("outras chegadas pulam a última vaga reservada no Grupo 2", async ({ page }) => {
  await abrirComRelogio(page)
  const grupos = page.getByRole("button", { name: "Grupos", exact: true })
  const fila = page.getByRole("button", { name: "Fila", exact: true })
  const grupo2 = page.getByRole("meter", { name: "Grupo 2" })
  const grupo3 = page.getByRole("meter", { name: "Grupo 3" })

  await page.clock.runFor(6 * intervalo)
  await expect(grupo2).toHaveAttribute("aria-valuenow", "19")
  await fila.press("Enter")
  await page.getByRole("button", { name: "Aprovar Ana" }).press("Enter")
  await page.getByRole("button", { name: "Chamar Ana" }).press("Enter")
  await page.clock.runFor(3 * intervalo)
  await grupos.press("Enter")
  await expect(grupo2).toHaveAttribute("aria-valuenow", "19")
  await expect(grupo3).toHaveAttribute("aria-valuenow", "1")

  await fila.press("Enter")
  await page.getByRole("button", { name: "Confirmar envio" }).press("Enter")
  await page.getByRole("button", { name: "Confirmar entrada" }).press("Enter")
  await grupos.press("Enter")
  await expect(grupo2).toHaveAttribute("aria-valuenow", "20")
  await expect(grupo3).toHaveAttribute("aria-valuenow", "1")
})

test("Ana confirma a última vaga reservada mesmo com avanço suspenso", async ({ page }) => {
  await abrirComRelogio(page)
  const abertura = page.locator("#inicio")
  const grupos = page.getByRole("button", { name: "Grupos", exact: true })
  const fila = page.getByRole("button", { name: "Fila", exact: true })
  const recentes = page.getByRole("list", { name: "Pedidos recentes" }).getByRole("listitem")
  await fila.press("Enter")
  await page.getByRole("button", { name: "Aprovar Ana" }).press("Enter")
  await page.clock.runFor(68 * intervalo)
  const ultimoPedido = recentes.filter({ hasText: "Pedido 23" })
  await expect(ultimoPedido).toContainText("Para analisar")
  await page.getByRole("button", { name: "Chamar Ana" }).press("Enter")

  await grupos.press("Enter")
  await expect(page.getByRole("meter", { name: "Grupo 3" })).toHaveAttribute(
    "aria-valuetext", "19 de 20 vagas ocupadas, 1 reservada para Ana",
  )
  await expect(abertura.getByText("Lotado", { exact: true })).toHaveCount(2)
  await expect(page.getByText("A última vaga está reservada para Ana.", { exact: false })).toBeVisible()

  await fila.press("Enter")
  await expect(recentes).toHaveCount(3)
  await page.clock.runFor(3 * intervalo)
  await expect(ultimoPedido).toContainText("Aguardando vaga")
  await page.getByRole("button", { name: "Confirmar envio" }).press("Enter")
  await page.getByRole("button", { name: "Confirmar entrada" }).press("Enter")
  await expect(page.getByRole("status").filter({ hasText: "Entrada confirmada" })).toBeVisible()
  await expect(page.getByText("Grupos lotados. Os pedidos aguardam vaga.", { exact: true })).toBeVisible()
  await expect(recentes).toHaveCount(3)
  await expect(ultimoPedido).toContainText("Aguardando vaga")

  await grupos.press("Enter")
  await expect(abertura.getByText("Lotado", { exact: true })).toHaveCount(3)
})
