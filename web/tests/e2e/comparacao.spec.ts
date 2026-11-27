import { expect, test } from "@playwright/test"

const titulo = "O que mudou de uma edição para a outra?"
const termos = ["Pedidos de entrada", "Entradas confirmadas", "Conversão de pedidos em entradas"]
const visuais = ["+25%", "+4", "+10 p.p."]
const anunciados = ["+25%", "+4", "+10 pontos percentuais"]
const descricoes = [
  "De 16 para 20 pedidos. A comparação usa duas edições simuladas.",
  "De 8 para 12 pessoas na comunidade.",
  "Em outubro, 5 de cada 10 pedidos viraram entrada. Em novembro, foram 6 de cada 10.",
]
const numeroVisual = 'dd span[aria-hidden="true"]'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-20T12:00:00Z") })
  await page.clock.pauseAt(new Date("2026-11-20T12:01:00Z"))
})

for (const viewport of [{ width: 1440, height: 900 }, { width: 360, height: 800 }]) {
  test(`a comparação mostra os valores finais com movimento reduzido em ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/organizadores")
    const secao = page.locator("#comparacao-edicoes")
    await expect(secao.getByRole("heading", { name: titulo, level: 2, exact: true })).toBeVisible()
    await expect(secao.getByText("Outubro → novembro · dados de exemplo", { exact: true })).toHaveCount(0)
    await expect(secao.getByText("Como vamos medir o tempo da equipe no piloto?", { exact: true })).toHaveCount(0)
    const ordem = page.locator("#comparacao-edicoes, #planos")
    await expect(ordem).toHaveCount(2)
    await expect(ordem.first()).toHaveAttribute("id", "comparacao-edicoes")

    const metricas = secao.locator("dl > div")
    await expect(metricas).toHaveCount(3)
    await expect(metricas.getByRole("term")).toHaveText(termos)
    await secao.scrollIntoViewIfNeeded()
    expect(await metricas.locator(numeroVisual).allTextContents()).toEqual(visuais)
    await page.clock.runFor(160)
    expect(await metricas.locator(numeroVisual).allTextContents()).toEqual(visuais)
    for (const [indice, anunciado] of anunciados.entries()) {
      const definicao = metricas.nth(indice).getByRole("definition")
      expect(await definicao.ariaSnapshot()).toContain(anunciado)
      await expect(definicao.getByRole("paragraph")).toHaveText(descricoes[indice])
    }

    const caixas = await metricas.evaluateAll(itens => itens.map(item => {
      const { top, bottom, left, right } = item.getBoundingClientRect()
      return { top, bottom, left, right }
    }))
    for (let indice = 1; indice < caixas.length; indice++) {
      const anterior = caixas[indice - 1]
      const atual = caixas[indice]
      if (viewport.width === 360) {
        expect(atual.top).toBeGreaterThanOrEqual(anterior.bottom - 1)
        expect(Math.abs(atual.left - anterior.left)).toBeLessThanOrEqual(1)
      } else {
        expect(atual.left).toBeGreaterThanOrEqual(anterior.right - 1)
        expect(Math.abs(atual.top - anterior.top)).toBeLessThanOrEqual(1)
      }
    }
  })
}

test("os números contam uma vez e preservam o resultado ao voltar à seção", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto("/organizadores")
  const secao = page.locator("#comparacao-edicoes")
  const numeros = secao.locator(numeroVisual)
  await expect(secao).not.toBeInViewport()
  await expect(numeros).toHaveText(["+0%", "+0", "+0 p.p."])
  await secao.scrollIntoViewIfNeeded()
  await expect(secao).toBeInViewport()
  const contagensEmAndamento = new Set<number>()
  await expect.poll(async () => {
    await page.clock.runFor(32)
    for (const [indice, texto] of (await numeros.allTextContents()).entries()) {
      const valor = Number.parseInt(texto, 10)
      if (valor > 0 && valor < Number.parseInt(visuais[indice], 10)) contagensEmAndamento.add(indice)
    }
    return contagensEmAndamento.size
  }, { intervals: [25] }).toBe(3)
  await expect.poll(async () => {
    await page.clock.runFor(128)
    return numeros.allTextContents()
  }, { intervals: [25] }).toEqual(visuais)

  // Registra também mudanças que poderiam passar entre duas leituras do teste.
  const mudancas = await secao.evaluateHandle(elemento => {
    const registros: string[][] = []
    new MutationObserver(() => {
      registros.push(Array.from(elemento.querySelectorAll('dd span[aria-hidden="true"]'), item => item.textContent ?? ""))
    }).observe(elemento, { childList: true, characterData: true, subtree: true })
    return registros
  })
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }))
  await expect(secao).not.toBeInViewport()
  await page.clock.runFor(200)
  await secao.scrollIntoViewIfNeeded()
  await expect(secao).toBeInViewport()
  await page.clock.runFor(2000)
  for (const leitura of await mudancas.jsonValue()) expect(leitura).toEqual(visuais)
  expect(await numeros.allTextContents()).toEqual(visuais)
})
