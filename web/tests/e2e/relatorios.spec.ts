import { expect, test } from "@playwright/test"

const canais = [
  { nome: "QR do encontro", cliques: 32 },
  { nome: "Link da comunidade", cliques: 25 },
  { nome: "Bio do evento", cliques: 20 },
  { nome: "Origem desconhecida", cliques: 3 },
]

for (const viewport of [{ width: 360, height: 800 }, { width: 1440, height: 900 }]) {
  test(`o relatório mostra o ranking dos quatro canais em ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto("/organizadores")
    const relatorio = page.getByRole("region", { name: "De onde vêm os cliques?" })
    const ranking = relatorio.getByRole("table", { name: "Cliques por canal", exact: true })
    await ranking.scrollIntoViewIfNeeded()
    await expect(ranking).toBeVisible()
    await expect(relatorio.getByText(/QR do encontro.*32 dos 80 cliques/i)).toBeVisible()
    await expect(ranking.getByRole("rowheader")).toHaveText(canais.map(canal => canal.nome))
    const linhas = ranking.getByRole("row").filter({ has: page.getByRole("rowheader") })
    await expect(linhas).toHaveCount(4)
    for (const [indice, canal] of canais.entries()) {
      const contagem = linhas.nth(indice).getByRole("cell")
      await expect(contagem).toBeVisible()
      await expect(contagem).toHaveText(String(canal.cliques))
    }

    await expect(relatorio.getByRole("combobox")).toHaveCount(0)
    await expect(relatorio).not.toContainText(/Edição de exemplo|16 a 22 de novembro/)
    await expect(relatorio).not.toContainText(/Cliques por dia|Ver valores por dia|Pedidos e entradas|pedidos resultaram em entrada/i)
    await expect(relatorio.locator("details")).toHaveCount(0)
    await expect(relatorio.getByRole("table", { includeHidden: true })).toHaveCount(1)
    await expect(relatorio.getByRole("definition", { includeHidden: true })).toHaveCount(0)

    const cabeNaTela = await ranking.evaluate(tabela => {
      const { left, right } = tabela.getBoundingClientRect()
      return left >= 0 && right <= document.documentElement.clientWidth + 1
    })
    expect(cabeNaTela).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
