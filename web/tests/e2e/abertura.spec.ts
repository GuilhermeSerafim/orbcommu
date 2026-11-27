import { expect, test } from "@playwright/test"

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

test("pausar e avançar com controle de visibilidade", async ({ page }) => {
  await page.clock.install()
  await page.goto("/organizadores")
  const contador = page.getByText(/^1\.28\d$/, { exact: true })
  const inicial = await contador.innerText()
  await page.getByRole("button", { name: "Pausar animação" }).click()
  await page.clock.runFor(3300)
  await expect(contador).toHaveText(inicial)

  await page.getByRole("button", { name: "Retomar animação" }).click()
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true })
    document.dispatchEvent(new Event("visibilitychange"))
  })
  await page.clock.runFor(3300)
  await expect(contador).toHaveText(inicial)

  await page.evaluate(() => {
    const espaco = document.createElement("div")
    espaco.style.height = "200vh"
    document.querySelector("main")?.append(espaco)
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  await expect(page.locator("#inicio")).not.toBeInViewport()
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden")
    document.dispatchEvent(new Event("visibilitychange"))
  })
  await page.clock.runFor(3300)
  await expect(contador).toHaveText(inicial)

  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.clock.runFor(3300)
  await expect(contador).toHaveText(inicial)
  await page.getByRole("button", { name: "Avançar", exact: true }).press("Enter")
  await expect(contador).toHaveText("1.285")
})

test("a entrada seguinte ao grupo cheio ocupa o próximo grupo", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/organizadores")
  const avancar = page.getByRole("button", { name: "Avançar", exact: true })
  const grupo2 = page.getByRole("meter", { name: "Grupo 2" })
  const grupo3 = page.getByRole("meter", { name: "Grupo 3" })
  for (let passo = 0; passo < 9; passo++) await avancar.click()
  await expect(grupo2).toHaveAttribute("aria-valuenow", "20")
  await expect(grupo3).toHaveAttribute("aria-valuenow", "0")
  for (let passo = 0; passo < 3; passo++) await avancar.click()
  await expect(grupo2).toHaveAttribute("aria-valuenow", "20")
  await expect(grupo3).toHaveAttribute("aria-valuenow", "1")
})


test("pedidos recentes e suas confirmações aparecem na Fila com avanço automático e manual", async ({ page }) => {
  await page.clock.install()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/organizadores")
  await page.getByRole("button", { name: "Fila", exact: true }).click()
  await page.clock.runFor(3300)
  const recentes = page.getByRole("list", { name: "Pedidos recentes" })
  await expect(recentes.getByRole("listitem").filter({ hasText: "Pedido 1" })).toContainText("Entrada confirmada")
  await page.getByRole("button", { name: "Pausar animação" }).click()
  const avancar = page.getByRole("button", { name: "Avançar", exact: true })
  await avancar.press("Enter")
  await avancar.press("Enter")
  const segundo = recentes.getByRole("listitem").filter({ hasText: "Pedido 2" })
  await expect(segundo).toContainText("Para analisar")
  await avancar.press("Enter")
  await expect(segundo).toContainText("Entrada confirmada")
  await expect(page.getByRole("button", { name: "Aprovar Ana" })).toBeVisible()
  await page.getByRole("button", { name: "Grupos", exact: true }).click()
  await expect(page.getByRole("meter", { name: "Grupo 2" })).toHaveAttribute("aria-valuenow", "19")
})

test("lotação suspende a simulação e reiniciar libera o fluxo de Ana", async ({ page }) => {
  await page.clock.install()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/organizadores")
  const grupos = page.getByRole("button", { name: "Grupos", exact: true })
  const fila = page.getByRole("button", { name: "Fila", exact: true })
  await fila.click()
  for (const nome of ["Aprovar Ana", "Chamar Ana", "Confirmar envio"]) {
    await page.getByRole("button", { name: nome, exact: true }).press("Enter")
  }
  await grupos.click()
  await page.clock.runFor(75900)
  await expect(page.getByText("Lotado", { exact: true })).toHaveCount(3)
  await expect(page.getByRole("button", { name: "Avançar", exact: true })).toBeDisabled()
  await fila.click()
  await expect(page.getByText("Grupos lotados. Os pedidos aguardam vaga.", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Confirmar entrada", exact: true })).toBeDisabled()
  await expect(page.getByRole("list", { name: "Pedidos recentes" }).getByRole("listitem")).toHaveCount(3)
  await page.getByRole("button", { name: "Pausar animação" }).press("Enter")
  await page.getByRole("button", { name: "Reiniciar", exact: true }).press("Enter")
  await expect(page.getByRole("list", { name: "Pedidos recentes" })).toHaveCount(0)
  for (const nome of ["Aprovar Ana", "Chamar Ana", "Confirmar envio", "Confirmar entrada"]) {
    await page.getByRole("button", { name: nome, exact: true }).press("Enter")
  }
  await expect(page.getByRole("status").filter({ hasText: "Entrada confirmada" })).toBeVisible()
  await grupos.click()
  await expect(page.getByText("1.284", { exact: true })).toBeVisible()
  await expect(page.getByRole("meter", { name: "Grupo 2" })).toHaveAttribute("aria-valuenow", "18")
})
