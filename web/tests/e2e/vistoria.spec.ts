import { devices, expect } from "@playwright/test"
import { test } from "../support/playwright"
import { banco } from "../support/banco"
import { comFixtureConvite } from "../support/convite"
import { criarOperadores, fazerLogin } from "../support/operadores"
import { criarCasoPedido } from "../support/pedidos"

test.use({ userAgent: devices["Pixel 7"].userAgent })

test("compartilha conversa, aprovação e encerramento entre contas", async ({ page, browser }) => {
  test.setTimeout(90_000)
  const contas = await criarOperadores()
  const segunda = await browser.newPage()
  const leitora = await browser.newPage()
  const ana = criarCasoPedido()
  const bia = criarCasoPedido()
  try {
    await banco.query("update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('nome_exibicao', 'Marina') where id = $1", [contas.primeira.id])
    for (const { pedido } of [ana, bia]) {
      await banco.query("insert into orbcommu.pedidos (comunidade,nome,telefone,origem,situacao) values ('meet-up-tech-sp',$1,$2,'Link geral','Para analisar')", [pedido.nome, pedido.telefone])
    }

    await fazerLogin(page, contas.primeira)
    await fazerLogin(segunda, contas.segunda)
    await page.getByLabel("Pesquisar").fill(ana.pedido.nome)
    const linha = page.getByRole("listitem")
    await expect(linha).toContainText("Para analisar")
    const conversar = linha.getByRole("button", { name: "Conversar no WhatsApp" })
    await expect(conversar).toBeVisible()
    await page.context().route("https://wa.me/**", route => route.fulfill({ body: "WhatsApp simulado" }))
    const abriu = page.context().waitForEvent("page")
    await conversar.click()
    const conversa = await abriu
    await expect(conversa).toHaveURL("https://wa.me/" + ana.pedido.telefone)
    await conversa.close()
    await expect(conversar).toBeFocused()
    await expect(linha).toContainText(/Marina abriu o WhatsApp às \d{2}:\d{2}/)

    const buscaSegunda = segunda.getByLabel("Pesquisar")
    await buscaSegunda.fill(ana.pedido.nome)
    const linhaSegunda = segunda.getByRole("listitem")
    await expect(linhaSegunda).toContainText("Marina abriu o WhatsApp")
    await segunda.bringToFront()
    const aprovacaoSegunda = linhaSegunda.getByRole("button", { name: "Aprovar" })
    await aprovacaoSegunda.focus()
    await expect(aprovacaoSegunda).toBeFocused()
    await page.bringToFront()
    await linha.getByRole("button", { name: "Aprovar" }).click()
    await expect(linha).toContainText("Aguardando vaga")
    await segunda.bringToFront()
    await segunda.evaluate(() => window.dispatchEvent(new Event("focus")))
    await expect(linhaSegunda).toContainText("Aguardando vaga")
    await expect(linhaSegunda).toContainText("Marina aprovou")
    await expect(linhaSegunda.getByText("Aguardando vaga", { exact: true })).toBeFocused()
    await expect(buscaSegunda).toHaveValue(ana.pedido.nome)

    await page.getByLabel("Pesquisar").fill(bia.pedido.nome)
    await linha.getByRole("button", { name: "Conversar no WhatsApp" }).waitFor()
    await page.frameLocator('iframe[title="Abertura do WhatsApp"]').locator("html").evaluate(() => {
      const abrir = window.open
      window.open = () => {
        window.open = abrir
        return {
          closed: false,
          close() {},
          location: { replace() { throw new DOMException("Navegação bloqueada", "SecurityError") } },
        } as unknown as Window
      }
    })
    await linha.getByRole("button", { name: "Conversar no WhatsApp" }).click()
    await expect(linha.getByRole("link", { name: "Abrir a conversa" })).toHaveAttribute("href", "https://wa.me/" + bia.pedido.telefone)
    await expect(linha).toContainText("Marina abriu o WhatsApp")
    await expect(linha.getByRole("alert")).toHaveCount(0)

    await buscaSegunda.fill(bia.pedido.nome)
    await segunda.getByLabel("Situação").selectOption("Para analisar")
    await segunda.bringToFront()
    const encerramentoSegunda = linhaSegunda.getByRole("button", { name: "Encerrar pedido" })
    await encerramentoSegunda.focus()
    await expect(encerramentoSegunda).toBeFocused()
    await page.bringToFront()
    await linha.getByRole("button", { name: "Encerrar pedido" }).click()
    await expect(linha).toContainText("Encerrado na vistoria")
    await segunda.bringToFront()
    await segunda.evaluate(() => window.dispatchEvent(new Event("focus")))
    await expect(linhaSegunda).toHaveCount(0)
    await expect(buscaSegunda).toBeFocused()
    await page.getByLabel("Situação").selectOption("Finalizados")
    await expect(linha).toContainText("Encerrado na vistoria")
    await expect(linha).toContainText("Marina encerrou o pedido")

    await fazerLogin(leitora, contas.leitora)
    const pendente = criarCasoPedido()
    try {
      await banco.query("insert into orbcommu.pedidos (comunidade,nome,telefone,origem,situacao) values ('meet-up-tech-sp',$1,$2,'Link geral','Para analisar')", [pendente.pedido.nome, pendente.pedido.telefone])
      await leitora.getByLabel("Pesquisar").fill(pendente.pedido.nome)
      const consulta = leitora.getByRole("listitem")
      await expect(consulta).toContainText("Para analisar")
      await expect(consulta.getByRole("button")).toHaveCount(0)
    } finally { await pendente.limpar() }
  } finally {
    await Promise.all([ana.limpar(), bia.limpar(), segunda.close(), leitora.close()])
    await contas.limpar()
  }
})

test("compartilha o link do grupo apenas entre contas operacionais", async ({ page, browser }) => {
  test.setTimeout(90_000)
  const contas = await criarOperadores()
  const segunda = await browser.newPage()
  const leitora = await browser.newPage()

  try {
    await comFixtureConvite("meet-up-tech-sp", async (convite) => {
      await fazerLogin(page, contas.primeira)
      await page.getByText("Link do grupo", { exact: true }).click()
      const campo = page.getByLabel("Link de convite do WhatsApp")
      await campo.fill(convite + "?mode=ac_t")
      await page.getByRole("button", { name: "Salvar link" }).click()
      await expect(page.getByText("Link salvo.")).toBeVisible()
      await expect(campo).toHaveValue(convite)

      await campo.fill("https://example.test/formulario")
      await page.getByRole("button", { name: "Salvar link" }).click()
      await expect(page.getByText("Informe um link de convite do grupo do WhatsApp.")).toBeVisible()

      await fazerLogin(segunda, contas.segunda)
      await segunda.getByText("Link do grupo", { exact: true }).click()
      await expect(segunda.getByLabel("Link de convite do WhatsApp")).toHaveValue(convite)

      await fazerLogin(leitora, contas.leitora)
      await expect(leitora).toHaveURL(/\/fila$/)
      await expect(leitora.getByText("Link do grupo", { exact: true })).toHaveCount(0)
      await expect(leitora.getByLabel("Link de convite do WhatsApp")).toHaveCount(0)
      const lista = await leitora.request.get("/api/fila")
      expect(lista.ok()).toBe(true)
      expect(await lista.text()).not.toContain(new URL(convite).pathname.slice(1))
    })
  } finally {
    await Promise.all([segunda.close(), leitora.close()])
    await contas.limpar()
  }
})
