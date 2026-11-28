import { randomUUID } from "node:crypto"
import { expect } from "@playwright/test"
import { test } from "../support/playwright"
import { banco } from "../support/banco"
import { criarOperadores, fazerLogin } from "../support/operadores"
import { usarCasoPedido } from "../support/pedidos"

test("da divulgação ao pedido e aos resultados, com acesso por perfil", async ({ browser, page }) => {
  test.setTimeout(90_000)
  const contas = await criarOperadores()
  const nomeEvento = "Edição " + randomUUID()
  const visitante = await browser.newPage()
  const consulta = await browser.newPage()
  try {
    await fazerLogin(page, contas.primeira)
    await page.getByRole("link", { name: "Divulgações", exact: true }).click()
    await page.getByRole("link", { name: "Nova divulgação" }).click()
    await page.getByLabel("Nome do evento").fill(nomeEvento)
    await page.getByRole("button", { name: "Período da divulgação" }).click()
    await page.locator('[data-today="true"] button').click()
    await page.getByRole("button", { name: "Aplicar período" }).click()
    await page.getByRole("button", { name: "Gerar link e QR" }).click()
    await expect(page.getByRole("heading", { name: nomeEvento })).toBeVisible()
    const link = await page.getByLabel("Link da divulgação").inputValue()
    const edicao = page.url()
    const download = page.waitForEvent("download")
    await page.getByRole("link", { name: "Baixar QR" }).click()
    expect((await download).suggestedFilename()).toMatch(/\.png$/)
    await usarCasoPedido(async caso => {
      const previa = await visitante.request.get(link, { headers: { "User-Agent": "Twitterbot/1.0" } })
      const cabecalho = (await previa.text()).split("</head>")[0]
      expect(cabecalho).toContain(`property="og:title" content="${nomeEvento} · OrbCommu"`)
      expect(cabecalho).toContain(`property="og:url" content="https://orbcommu.vercel.app${new URL(link).pathname}"`)
      await visitante.goto(link)
      await visitante.getByLabel("Como você quer ser chamado?").fill(caso.pedido.nome)
      await visitante.getByLabel("WhatsApp com DDD").fill(caso.pedido.telefone)
      await visitante.getByRole("button", { name: "Enviar pedido" }).click()
      await expect(visitante.getByRole("heading", { name: /Recebemos seu pedido/ })).toBeVisible()
      expect(await caso.linhas()).toMatchObject([{ origem: nomeEvento }])
      await fazerLogin(consulta, contas.leitora)
      await expect(consulta.getByRole("heading", { name: "Fila de entrada" })).toBeVisible()
      await consulta.goto(edicao)
      await expect(consulta.getByText("0 de 1 pessoa com entrada confirmada")).toBeVisible()
      await expect(consulta.getByRole("button", { name: "Encerrar divulgação" })).toHaveCount(0)
      await visitante.goto(link)
      await page.getByRole("button", { name: "Encerrar divulgação" }).click()
      await page.getByRole("button", { name: "Encerrar de vez" }).click()
      await expect(page.getByText("Encerrada", { exact: true })).toBeVisible()
      await visitante.getByLabel("Como você quer ser chamado?").fill(caso.pedido.nome)
      await visitante.getByLabel("WhatsApp com DDD").fill(caso.pedido.telefone)
      await visitante.getByRole("button", { name: "Enviar pedido" }).click()
      await expect(visitante.getByRole("heading", { name: "Divulgação encerrada" })).toBeVisible()
      await visitante.reload()
      await expect(visitante.getByRole("heading", { name: "Divulgação encerrada" })).toBeVisible()
      expect(await caso.linhas()).toHaveLength(1)
    })
  } finally {
    await visitante.close()
    await consulta.close()
    await banco.query("delete from orbcommu.divulgacoes where comunidade = 'meet-up-tech-sp' and nome = $1", [nomeEvento])
    await contas.limpar()
  }
})
