import { expect, test } from "@playwright/test"

for (const largura of [390, 1440]) {
  test(`títulos, textos e controles usam as fontes da marca em ${largura}px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/organizadores")

    const titulo = /^["']?Bricolage Grotesque\b/
    const texto = /^["']?Instrument Sans\b/
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-family", titulo)
    await expect(page.getByRole("link", { name: "Ver como funciona" })).toHaveCSS("font-family", texto)

    const duvidas = page.getByRole("region", { name: "Dúvidas frequentes" })
    const pergunta = duvidas.getByRole("button").first()
    await pergunta.click()
    await expect(pergunta).toHaveCSS("font-family", texto)
    await expect(duvidas.getByRole("region").getByRole("paragraph")).toHaveCSS("font-family", texto)

    await page.getByRole("button", { name: "Entrar na fila da demonstração", exact: true }).first().click()
    const formulario = page.getByRole("dialog")
    await expect(formulario.getByRole("heading")).toHaveCSS("font-family", titulo)
    await expect(formulario.getByRole("textbox")).toHaveCSS("font-family", texto)

    const carregadas = await page.evaluate(async () => {
      await document.fonts.ready
      return Array.from(document.fonts).filter(fonte => fonte.status === "loaded").map(fonte => fonte.family)
    })
    expect(carregadas).toEqual(expect.arrayContaining([expect.stringMatching(titulo), expect.stringMatching(texto)]))
  })
}
