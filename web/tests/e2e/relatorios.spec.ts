import { expect, test, type Locator } from "@playwright/test"

const origens = ["QR do encontro", "Link da comunidade", "Bio do evento", "Origem desconhecida"]
const aberturasPorOrigem = [32, 25, 20, 3]
const aberturasPorDia = [4, 6, 10, 16, 21, 15, 8]
const datas = ["16 nov", "17 nov", "18 nov", "19 nov", "20 nov", "21 nov", "22 nov"]

async function conferirTabela(tabela: Locator, rotulos: string[], valores: number[]) {
  await expect(tabela).toBeVisible()
  await expect(tabela.getByRole("rowheader")).toHaveText(rotulos)
  await expect(tabela.getByRole("row")).toHaveCount(rotulos.length + 1)
  for (const [indice, rotulo] of rotulos.entries()) {
    const linha = tabela.getByRole("row").filter({ has: tabela.page().getByRole("rowheader", { name: rotulo, exact: true }) })
    const contagem = linha.getByRole("cell", { name: /^\d+$/ })
    await expect(contagem).toHaveCount(1)
    await expect(contagem).toHaveText(String(valores[indice]))
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
  await expect(svg.getByText("Cliques", { exact: true })).toBeVisible()
  await expect(valor).toHaveCount(ocorrenciasNoEixo + 1)
}

test("o ranking de novembro fica visível e os detalhes de cliques e entradas abrem separadamente", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/organizadores")
  const relatorio = page.getByRole("region", { name: "De onde vêm os cliques?" })
  await expect(relatorio.getByRole("combobox")).toHaveCount(0)
  await expect(relatorio).not.toContainText("Edição de exemplo")
  await expect(relatorio).not.toContainText("16 a 22 de novembro")
  const ranking = relatorio.getByRole("table", { name: "Cliques por canal", exact: true })
  const abrirDias = relatorio.locator("summary").filter({ hasText: "Cliques por dia" })
  const abrirFunil = relatorio.locator("summary").filter({ hasText: "Pedidos e entradas" })
  const abrirValores = relatorio.locator("summary").filter({ hasText: /^Ver valores por dia$/ })
  const porDia = relatorio.getByRole("figure", { name: "Cliques por dia", exact: true })
  const tabelaDias = relatorio.getByRole("table", { name: "Cliques por dia", exact: true })
  const conversao = relatorio.getByText(/^12 de 20 pedidos resultaram em entrada \(60%\)\.?$/)
  await expect(abrirDias).toBeVisible()
  await expect(abrirFunil).toBeVisible()
  await expect(porDia).toBeHidden()
  await expect(conversao).toBeHidden()
  await expect(relatorio.getByRole("definition")).toHaveCount(0)
  await expect(relatorio.getByText(/QR do encontro.*32 dos 80 cliques/i)).toBeVisible()
  await conferirTabela(ranking, origens, aberturasPorOrigem)

  await abrirDias.press("Enter")
  await porDia.scrollIntoViewIfNeeded()
  await expect(porDia.getByText(/20 nov.*21 cliques/)).toBeVisible()
  await expect(porDia.locator("svg")).toBeVisible()
  await expect(conversao).toBeHidden()
  await expect(tabelaDias).toBeHidden()
  await abrirValores.press("Space")
  await conferirTabela(tabelaDias, datas, aberturasPorDia)

  await abrirFunil.press("Enter")
  await expect(relatorio.getByRole("term")).toHaveText(["Cliques no link", "Pedidos de entrada", "Entradas confirmadas"])
  await expect(relatorio.getByRole("definition")).toHaveText(["80", "20", "12"])
  await expect(conversao).toBeVisible()
  await expect(tabelaDias).toBeVisible()
  await abrirDias.press("Space")
  await expect(porDia).toBeHidden()
  await expect(conversao).toBeVisible()
  await abrirDias.press("Enter")
  await conferirLinha(porDia.locator("svg"), datas, aberturasPorDia)
  await abrirFunil.press("Space")
  await expect(conversao).toBeHidden()
  await expect(porDia).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
