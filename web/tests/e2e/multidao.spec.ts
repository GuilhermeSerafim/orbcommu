import { expect, test, type Locator, type Page } from "@playwright/test"

async function abrirMultidao(page: Page) {
  await page.goto("/organizadores")
  const cena = page.locator('#inicio [aria-hidden="true"][data-animada]')
  await cena.scrollIntoViewIfNeeded()
  await expect(cena).toBeInViewport()
  return cena
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 360, height: 800 },
]) {
  test(`multidão inteira atravessa a cena nos dois sentidos em ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: "no-preference" })
    const cena = await abrirMultidao(page)
    await expect(cena).toHaveAttribute("data-animada", "true")

    const trajetos = await cena.evaluate(elemento => {
      const limites = elemento.getBoundingClientRect()
      const imagens = Array.from(elemento.querySelectorAll("img")).filter(img => img.getClientRects().length)
      return imagens.map(img => {
        const animacao = img.getAnimations()[0]
        if (!animacao?.effect) throw new Error(`Personagem sem animação: ${img.src}`)
        const { delay = 0, duration, iterations } = animacao.effect.getComputedTiming()

        // A segunda volta permite compensar o atraso negativo de cada personagem.
        // Evita a descontinuidade no instante exato da troca de volta.
        const quadros = [0.0001, 0.25, 0.49, 0.51, 0.75, 0.9999].map(fase => {
          animacao.currentTime = delay + Number(duration) * (1 + fase)
          const caixa = img.getBoundingClientRect()
          return {
            esquerda: caixa.left - limites.left,
            direita: caixa.right - limites.left,
            topo: caixa.top - limites.top,
            base: caixa.bottom - limites.bottom,
          }
        })
        return { quadros, largura: limites.width, repetindo: iterations === Infinity, estado: animacao.playState }
      })
    })

    const sentidos = new Set<number>()
    expect(trajetos.length).toBeGreaterThan(0)
    for (const { quadros, largura, repetindo, estado } of trajetos) {
      expect(estado).toBe("running")
      expect(repetindo).toBe(true)
      for (const quadro of quadros) {
        expect(quadro.topo).toBeGreaterThanOrEqual(-0.5)
        expect(quadro.base).toBeLessThanOrEqual(0.5)
      }
      const inicio = quadros[0]
      const fim = quadros[quadros.length - 1]
      const sentido = Math.sign(fim.esquerda - inicio.esquerda)
      sentidos.add(sentido)
      const [bordaEsquerda, bordaDireita] = sentido > 0 ? [inicio, fim] : [fim, inicio]
      expect(bordaEsquerda.direita).toBeLessThanOrEqual(0.5)
      expect(bordaDireita.esquerda).toBeGreaterThanOrEqual(largura - 0.5)
      for (let indice = 1; indice < quadros.length; indice++) {
        expect(sentido * (quadros[indice].esquerda - quadros[indice - 1].esquerda)).toBeGreaterThan(0)
      }
    }
    expect(sentidos).toEqual(new Set([-1, 1]))
  })
}

async function verificarImoveis(cena: Locator) {
  await cena.scrollIntoViewIfNeeded()
  await expect(cena).toBeInViewport()
  await expect(cena).toHaveAttribute("data-animada", "false")
  const { antes, depois, largura } = await cena.evaluate(async elemento => {
    const imagens = Array.from(elemento.querySelectorAll("img")).filter(img => img.getClientRects().length)
    const proximoQuadro = () => new Promise<void>(resolver => requestAnimationFrame(() => resolver()))
    const posicoes = () => {
      const limites = elemento.getBoundingClientRect()
      return imagens.map(img => {
        const caixa = img.getBoundingClientRect()
        return [caixa.left - limites.left, caixa.right - limites.left, caixa.top - limites.top]
      })
    }
    await proximoQuadro()
    const antes = posicoes()
    await proximoQuadro()
    await proximoQuadro()
    return { antes, depois: posicoes(), largura: elemento.getBoundingClientRect().width }
  })
  expect(antes.some(([esquerda, direita]) => esquerda < largura && direita > 0)).toBe(true)
  expect(depois).toEqual(antes)
}

test("pausar ou preferir movimento reduzido mantém a multidão imóvel", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  const cena = await abrirMultidao(page)
  await expect(cena).toHaveAttribute("data-animada", "true")
  await page.getByRole("button", { name: "Pausar animação" }).click()
  await verificarImoveis(cena)
  await page.getByRole("button", { name: "Retomar animação" }).click()
  await expect(cena).toHaveAttribute("data-animada", "true")
  await page.emulateMedia({ reducedMotion: "reduce" })
  await verificarImoveis(cena)
})
