import { expect, test } from "@playwright/test"

const novembro = {
  edicao: "nov",
  periodo: "16 a 22 de novembro",
  dias: ["Dia 16, 4 aberturas", "Dia 17, 6 aberturas", "Dia 18, 10 aberturas",
    "Dia 19, 16 aberturas", "Dia 20, 21 aberturas", "Dia 21, 15 aberturas", "Dia 22, 8 aberturas"],
  origens: ["QR do encontro 32", "Link da comunidade 25", "Bio do evento 20", "Origem desconhecida 3"],
  aberturas: "80",
  conversao: "12 de 20 pedidos resultaram em entrada (60%)",
}

const outubro = {
  edicao: "out",
  periodo: "19 a 25 de outubro",
  dias: ["Dia 19, 3 aberturas", "Dia 20, 8 aberturas", "Dia 21, 12 aberturas",
    "Dia 22, 9 aberturas", "Dia 23, 15 aberturas", "Dia 24, 12 aberturas", "Dia 25, 5 aberturas"],
  origens: ["QR do encontro 24", "Link da comunidade 20", "Bio do evento 16", "Origem desconhecida 4"],
  aberturas: "64",
  conversao: "8 de 16 pedidos resultaram em entrada (50%)",
}

test("trocar a edição substitui todos os números", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto("/organizadores")
  const seletor = page.getByRole("combobox", { name: "Edição de exemplo" })
  await expect(seletor).toHaveValue("nov")
  const relatorio = page.getByRole("region", { name: "De onde vêm os cliques?" })
  const grafico = relatorio.getByRole("group", { name: "Aberturas por dia" })
  const origens = relatorio.getByRole("group", { name: "Origem das aberturas" })
  const totalAberturas = relatorio.getByRole("definition").nth(0)

  for (const dados of [novembro, outubro, novembro]) {
    await seletor.selectOption(dados.edicao)
    await expect(relatorio).toContainText(dados.periodo)
    await expect(grafico.getByRole("img")).toHaveCount(7)
    for (const [indice, dia] of dados.dias.entries()) {
      await expect(grafico.getByRole("img").nth(indice)).toHaveAccessibleName(dia)
    }
    await expect(origens.getByRole("listitem")).toHaveText(dados.origens, { useInnerText: true })
    await expect(totalAberturas).toHaveText(dados.aberturas)
    await expect(relatorio).toContainText(dados.conversao)
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
