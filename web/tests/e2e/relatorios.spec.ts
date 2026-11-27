import { expect, test, type Locator } from "@playwright/test"

const origens = ["QR do encontro", "Link da comunidade", "Bio do evento", "Origem desconhecida"]
const aberturasPorOrigem = [32, 25, 20, 3]
const aberturasPorDia = [4, 6, 10, 16, 21, 15, 8]
const datas = ["16 nov", "17 nov", "18 nov", "19 nov", "20 nov", "21 nov", "22 nov"]

async function conferirTabela(tabela: Locator, rotulos: string[], valores: number[]) {
  await expect(tabela.getByRole("row")).toHaveCount(rotulos.length + 1)
  for (const [indice, rotulo] of rotulos.entries()) {
    const linha = tabela.getByRole("row").filter({ has: tabela.page().getByRole("rowheader", { name: rotulo, exact: true }) })
    await expect(linha.getByRole("cell", { name: String(valores[indice]), exact: true })).toBeVisible()
  }
}

async function conferirLinha(svg: Locator, datas: string[], valores: number[]) {
  await svg.scrollIntoViewIfNeeded()
  await expect(svg).toBeVisible()
  const inicio = svg.getByText(datas[0], { exact: true })
  const fim = svg.getByText(datas[datas.length - 1], { exact: true })
  await expect(inicio).toBeVisible()
  await expect(fim).toBeVisible()

  // O dia central está entre as duas extremidades mesmo quando o eixo omite rótulos no celular.
  const [primeiro, ultimo, grafico] = await Promise.all([inicio.boundingBox(), fim.boundingBox(), svg.boundingBox()])
  if (!primeiro || !ultimo || !grafico) throw new Error("Gráfico de dias sem dimensões")
  const x = (primeiro.x + primeiro.width / 2 + ultimo.x + ultimo.width / 2) / 2
  const valor = svg.getByText(String(valores[Math.floor(valores.length / 2)]), { exact: true }).filter({ visible: true })
  const ocorrenciasNoEixo = await valor.count()
  await svg.page().mouse.move(x, grafico.y + grafico.height / 2)
  await expect(svg.getByText("Aberturas", { exact: true })).toBeVisible()
  await expect(valor).toHaveCount(ocorrenciasNoEixo + 1)
}

test("o relatório apresenta os totais, os gráficos e as tabelas de novembro", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/organizadores")
  const relatorio = page.getByRole("region", { name: "De onde vêm os cliques?" })
  await expect(relatorio.getByRole("combobox")).toHaveCount(0)
  await expect(relatorio).not.toContainText("Edição de exemplo")
  await expect(relatorio).not.toContainText("16 a 22 de novembro")
  await expect(relatorio.getByRole("definition")).toHaveText(["80", "20", "12"])
  await expect(relatorio).toContainText("12 de 20 pedidos resultaram em entrada (60%)")

  const porOrigem = relatorio.getByRole("figure", { name: "Aberturas por origem", exact: true })
  const porDia = relatorio.getByRole("figure", { name: "Aberturas por dia", exact: true })
  const tabelaOrigens = relatorio.getByRole("table", { name: "Aberturas por origem", exact: true })
  const tabelaDias = relatorio.getByRole("table", { name: "Aberturas por dia", exact: true })
  await expect(tabelaOrigens).toBeHidden()
  await relatorio.locator("summary").filter({ hasText: "Ver dados dos gráficos" }).press("Enter")

  await conferirTabela(tabelaOrigens, origens, aberturasPorOrigem)
  await conferirTabela(tabelaDias, datas, aberturasPorDia)

  await porOrigem.scrollIntoViewIfNeeded()
  const ranking = porOrigem.locator("svg")
  await expect(ranking).toBeVisible()
  await expect(porOrigem).toContainText("QR do encontro respondeu por 40% das aberturas.")
  for (const valor of aberturasPorOrigem) {
    await expect(ranking.getByText(String(valor), { exact: true })).toBeVisible()
  }
  await conferirLinha(porDia.locator("svg"), datas, aberturasPorDia)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
