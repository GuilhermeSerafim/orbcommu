import { expect, test, type Locator } from "@playwright/test"

const origens = ["QR do encontro", "Link da comunidade", "Bio do evento", "Origem desconhecida"]
const novembro = {
  edicao: "nov",
  periodo: "16 a 22 de novembro",
  primeiroDia: 16,
  dias: [4, 6, 10, 16, 21, 15, 8],
  origens: [32, 25, 20, 3],
  participacao: "40%",
  totais: ["80", "20", "12"],
  conversao: "12 de 20 pedidos resultaram em entrada (60%)",
}
const outubro = {
  edicao: "out",
  periodo: "19 a 25 de outubro",
  primeiroDia: 19,
  dias: [3, 8, 12, 9, 15, 12, 5],
  origens: [24, 20, 16, 4],
  participacao: "37,5%",
  totais: ["64", "16", "8"],
  conversao: "8 de 16 pedidos resultaram em entrada (50%)",
}

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

test("trocar a edição atualiza os totais, os gráficos e as tabelas", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/organizadores")
  const relatorio = page.getByRole("region", { name: "De onde vêm os cliques?" })
  const seletor = relatorio.getByRole("combobox", { name: "Edição de exemplo" })
  await expect(seletor).toHaveValue("nov")

  const porOrigem = relatorio.getByRole("figure", { name: "Aberturas por origem", exact: true })
  const porDia = relatorio.getByRole("figure", { name: "Aberturas por dia", exact: true })
  const tabelaOrigens = relatorio.getByRole("table", { name: "Aberturas por origem", exact: true })
  const tabelaDias = relatorio.getByRole("table", { name: "Aberturas por dia", exact: true })
  await expect(tabelaOrigens).toBeHidden()
  await relatorio.locator("summary").filter({ hasText: "Ver dados dos gráficos" }).press("Enter")

  for (const dados of [novembro, outubro, novembro]) {
    await page.mouse.move(0, 0)
    await seletor.selectOption(dados.edicao)
    await expect(relatorio).toContainText(dados.periodo)
    await expect(relatorio.getByRole("definition")).toHaveText(dados.totais)
    await expect(relatorio).toContainText(dados.conversao)

    const datas = dados.dias.map((_, indice) => `${dados.primeiroDia + indice} ${dados.edicao}`)
    await conferirTabela(tabelaOrigens, origens, dados.origens)
    await conferirTabela(tabelaDias, datas, dados.dias)

    await porOrigem.scrollIntoViewIfNeeded()
    const ranking = porOrigem.locator("svg")
    await expect(ranking).toBeVisible()
    await expect(porOrigem).toContainText(`QR do encontro respondeu por ${dados.participacao} das aberturas.`)
    for (const valor of dados.origens) {
      await expect(ranking.getByText(String(valor), { exact: true })).toBeVisible()
    }
    await conferirLinha(porDia.locator("svg"), datas, dados.dias)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
