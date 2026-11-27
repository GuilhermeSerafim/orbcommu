import { expect, test } from "@playwright/test"

const links = ["Como funciona", "Distribuição", "Relatórios", "Planos", "Dúvidas", "Entrar como equipe"]

for (const largura of [390, 900]) {
  test(`menu recolhido navega pelas seções e dá acesso à equipe em ${largura}px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 844 })
    await page.goto("/")
    const botao = page.getByRole("button", { name: /\bmenu\b/i })
    const secoes = page.getByRole("navigation", { name: "Seções", exact: true })
    await expect(botao).toHaveAccessibleName("Menu")
    await expect(botao).toHaveAttribute("aria-expanded", "false")
    await expect(botao).toHaveAttribute("aria-controls", /^\S+$/)
    await expect(secoes).toBeHidden()

    await botao.press("Enter")
    await expect(botao).toHaveAttribute("aria-expanded", "true")
    for (const nome of links) {
      await expect(secoes.getByRole("link", { name: nome, exact: true })).toBeVisible()
    }
    const idControlado = await botao.getAttribute("aria-controls")
    expect(await secoes.getByRole("link").evaluateAll((itens, id) => {
      const painel = id && document.getElementById(id)
      return Boolean(painel && itens.every(item => painel.contains(item)))
    }, idControlado)).toBe(true)

    const duvidas = secoes.getByRole("link", { name: "Dúvidas", exact: true })
    expect((await duvidas.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    await duvidas.focus()
    await page.keyboard.press("Escape")
    await expect(botao).toHaveAttribute("aria-expanded", "false")
    await expect(secoes).toBeHidden()
    await expect(botao).toBeFocused()

    await botao.click()
    await duvidas.click()
    await expect(page).toHaveURL(/\/#duvidas$/)
    await expect(page.locator("#duvidas")).toBeInViewport()
    await expect(page.locator("#duvidas")).toBeFocused()
    await expect(botao).toHaveAttribute("aria-expanded", "false")
    await expect(secoes).toBeHidden()

    await botao.click()
    await secoes.getByRole("link", { name: "Entrar como equipe", exact: true }).click()
    await expect(page).toHaveURL(/\/entrar$/)
  })
}

for (const largura of [901, 1440]) {
  test(`cabeçalho exibe os links de navegação diretamente em ${largura}px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 })
    await page.goto("/")
    await expect(page.getByRole("button", { name: /\bmenu\b/i })).toBeHidden()
    const secoes = page.getByRole("navigation", { name: "Seções", exact: true })
    for (const nome of links) {
      await expect(secoes.getByRole("link", { name: nome, exact: true })).toBeVisible()
    }
  })
}
