import { randomUUID } from "node:crypto"
import { devices, expect } from "@playwright/test"
import { test } from "../support/playwright"
import { banco } from "../support/banco"
import { comFixtureConvite } from "../support/convite"
import { criarOperadores, fazerLogin } from "../support/operadores"
import { criarCasoPedido } from "../support/pedidos"

test.use({ userAgent: devices["Pixel 7"].userAgent })

test("chama a pessoa escolhida, recupera a reserva e confirma o envio", async ({ page }) => {
  test.setTimeout(90_000)
  const contas = await criarOperadores()
  const busca = randomUUID()
  const pessoas = [criarCasoPedido(busca), criarCasoPedido(busca)]
  try {
    await comFixtureConvite("meet-up-tech-sp", async convite => {
      await banco.query("insert into orbcommu.convites_do_grupo values ('meet-up-tech-sp',$1) on conflict (comunidade) do update set convite = excluded.convite", [convite])
      await banco.query("update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('nome_exibicao', 'Joana') where id=$1", [contas.primeira.id])
      for (const { pedido } of pessoas) {
        await banco.query("insert into orbcommu.pedidos (comunidade,nome,telefone,motivacao,origem,situacao) values ('meet-up-tech-sp',$1,$2,$3,'Link geral','Aguardando vaga')", [pedido.nome, pedido.telefone, busca])
      }
      await fazerLogin(page, contas.primeira)
      await page.getByLabel("Pesquisar").fill(busca)
      const lista = page.getByRole("listitem").filter({ hasText: busca })
      await expect(lista).toHaveCount(2)
      const linha = lista.nth(1)
      await expect(linha).toContainText(pessoas[1].pedido.nome)
      await page.context().route("https://wa.me/**", route => route.fulfill({ body: "Conversa simulada" }))
      const primeiraLinha = lista.first()
      const abriuAba = page.context().waitForEvent("page")
      await primeiraLinha.getByRole("button", { name: "Chamar", exact: true }).click()
      const aba = await abriuAba
      await expect(aba).toHaveURL(url => url.pathname === "/" + pessoas[0].pedido.telefone)
      await primeiraLinha.getByRole("button", { name: "Desfazer chamada" }).click()
      await expect(primeiraLinha).toContainText("Aguardando vaga")
      await page.route("**/fila", route => route.abort("failed"), { times: 1 })
      await linha.getByRole("button", { name: "Chamar", exact: true }).click()
      await expect(linha.getByRole("alert")).toBeVisible()
      await expect(aba).toHaveURL(url => url.pathname === "/" + pessoas[0].pedido.telefone)
      await linha.getByRole("button", { name: "Chamar", exact: true }).click()
      await expect(aba).toHaveURL(url => url.pathname === "/" + pessoas[1].pedido.telefone && !!url.searchParams.get("text")?.includes(convite))
      expect(page.context().pages()).toHaveLength(2)
      expect(await aba.evaluate(() => window.opener === null || window.opener !== window.opener.top)).toBe(true)
      await aba.close()
      async function abrir(rotulo: string, alvo = linha) {
        const abriu = page.context().waitForEvent("page")
        await alvo.getByRole("button", { name: rotulo, exact: true }).click()
        const conversa = await abriu
        await expect(conversa).toHaveURL(url => url.hostname === "wa.me" && url.pathname === "/" + pessoas[1].pedido.telefone)
        const mensagem = new URL(conversa.url()).searchParams.get("text")
        expect(mensagem).toContain(convite)
        expect(mensagem).toMatch(/solicite entrada no grupo pelo WhatsApp em até 24 horas/i)
        expect(mensagem).toContain("perde a vez")
        await conversa.close()
      }
      const registro = async () => (await pessoas[1].linhas())[0]
      const primeira = (await registro()).reserva_id
      await expect(linha.getByRole("button", { name: "Confirmar envio" })).toBeVisible()
      const pendentes = await page.request.get("/api/fila", { params: { situacao: "Envio a confirmar", busca } })
      expect(pendentes.ok()).toBe(true)
      expect((await pendentes.json()).total).toBe(1)
      await abrir("Reabrir conversa")
      expect((await registro()).reserva_id).toBe(primeira)
      await linha.getByRole("button", { name: "Desfazer chamada" }).click()
      await expect(linha).toContainText("Aguardando vaga")
      await expect(linha).toContainText(pessoas[1].pedido.nome)

      await page.getByLabel("Situação").selectOption("Aguardando vaga")
      await expect(lista).toHaveCount(2)
      // A gravação termina no servidor antes de o navegador perder a resposta.
      await page.route("**/fila", async route => {
        if (!route.request().headers()["next-action"]) return route.continue()
        const resposta = await route.fetch()
        expect(resposta.ok()).toBe(true)
        await route.abort("failed")
      }, { times: 1 })
      await linha.getByRole("button", { name: "Chamar", exact: true }).click()
      const recuperada = lista.filter({ hasText: pessoas[1].pedido.nome })
      await expect(recuperada.locator(".situacao")).toBeFocused()
      await expect(recuperada.getByRole("alert")).toBeVisible()
      await expect(recuperada.getByRole("button", { name: "Reabrir conversa" })).toBeVisible()
      const segunda = (await registro()).reserva_id
      expect(segunda).not.toBe(primeira)
      expect((await registro()).enviado_em).toBeNull()
      await abrir("Reabrir conversa", recuperada)
      expect((await registro()).reserva_id).toBe(segunda)
      await recuperada.getByRole("button", { name: "Confirmar envio" }).click()
      await expect(recuperada.locator(".situacao")).toHaveText("Convite enviado")
      await expect(recuperada.locator(".historico-vistoria")).toHaveText("Enviado por Joana")
      await expect(recuperada.getByRole("button", { name: "Registrar desistência", exact: true })).toBeVisible()
      await page.getByRole("button", { name: "Voltar para Aguardando vaga" }).click()
      await expect(page.getByLabel("Pesquisar")).toHaveValue(busca)
      await expect(lista.first()).toContainText("Aguardando vaga")

      const terceira = criarCasoPedido(busca)
      pessoas.push(terceira)
      await banco.query("insert into orbcommu.pedidos (comunidade,nome,telefone,origem,situacao) values ('meet-up-tech-sp',$1,$2,'Link geral','Aguardando vaga')", [terceira.pedido.nome, terceira.pedido.telefone])
      await page.reload()
      await page.getByLabel("Pesquisar").fill(busca)
      await page.getByLabel("Situação").selectOption("Aguardando vaga")
      await expect(lista).toHaveCount(2)
      await page.frameLocator('iframe[title="Abertura do WhatsApp"]').locator("html").evaluate(() => { window.open = () => null })
      await lista.nth(1).getByRole("button", { name: "Chamar" }).click()
      const escolhida = lista.filter({ hasText: terceira.pedido.nome })
      const alternativa = escolhida.getByRole("link", { name: "Abrir a conversa" })
      await expect(alternativa).toBeFocused()
      const retomada = page.waitForEvent("popup")
      await alternativa.click()
      const conversa = await retomada
      await expect(conversa).toHaveURL(url => url.pathname === "/" + terceira.pedido.telefone && !!url.searchParams.get("text")?.includes(convite))
      await conversa.close()
      await escolhida.getByRole("button", { name: "Confirmar envio" }).click()
      await expect(escolhida).toContainText("Enviado por Joana")
      expect((await terceira.linhas())[0].enviado_por).toBe(contas.primeira.id)
      await page.getByRole("button", { name: "Voltar para Aguardando vaga" }).click()
      await expect(page.getByLabel("Pesquisar")).toHaveValue(busca)
      await expect(lista).toHaveCount(1)
      await expect(lista.first()).toContainText(pessoas[0].pedido.nome)
    })
  } finally {
    await Promise.all(pessoas.map(pessoa => pessoa.limpar()))
    await contas.limpar()
  }
})
test("uma chamada interrompida antes da gravação preserva a pessoa e a página de origem", async ({ page }) => {
  const contas = await criarOperadores()
  const busca = randomUUID()
  const pessoas = Array.from({ length: 7 }, () => criarCasoPedido(busca))
  try {
    for (const { pedido } of pessoas) {
      await banco.query("insert into orbcommu.pedidos (comunidade,nome,telefone,origem,situacao) values ('meet-up-tech-sp',$1,$2,'Link geral','Aguardando vaga')", [pedido.nome, pedido.telefone])
    }
    await fazerLogin(page, contas.primeira)
    await page.getByLabel("Pesquisar").fill(busca)
    await page.getByLabel("Situação").selectOption("Aguardando vaga")
    await page.getByRole("button", { name: "Próxima página" }).click()
    const pessoa = pessoas[6]
    const linha = page.getByRole("listitem").filter({ hasText: pessoa.pedido.nome })
    await page.evaluate(() => { window.open = () => null })
    await page.route("**/fila", route => route.request().headers()["next-action"] ? route.abort("failed") : route.continue())
    await linha.getByRole("button", { name: "Chamar", exact: true }).click()
    await expect(linha.getByRole("alert")).toBeVisible()
    await expect(linha.locator(".situacao")).toBeFocused()
    await expect(linha.getByRole("button", { name: "Chamar", exact: true })).toBeEnabled()
    expect((await pessoa.linhas())[0].reserva_id).toBeNull()
    await page.getByRole("button", { name: "Voltar para Aguardando vaga" }).click()
    await expect(page.getByLabel("Pesquisar")).toHaveValue(busca)
    await expect(page.getByText("6–7 de 7")).toBeVisible()
    await expect(linha).toBeVisible()
  } finally {
    await Promise.all(pessoas.map(pessoa => pessoa.limpar()))
    await contas.limpar()
  }
})

test("Cris confere a reserva quando o filtro aberto alcança 24 horas", async ({ page }) => {
  const contas = await criarOperadores()
  const busca = randomUUID()
  const pessoas = [criarCasoPedido(busca), criarCasoPedido(busca)]
  try {
    await fazerLogin(page, contas.segunda)
    for (const { pedido } of pessoas) {
      await banco.query(`insert into orbcommu.pedidos (comunidade,nome,telefone,origem,situacao,reserva_id,enviado_em,enviado_por_nome)
        values ('meet-up-tech-sp',$1,$2,'Link geral','Convite enviado',gen_random_uuid(),statement_timestamp()-interval '24 hours'+interval '4 seconds','Joana')`, [pedido.nome, pedido.telefone])
    }
    await page.getByLabel("Pesquisar").fill(busca)
    const filtro = page.getByLabel("Situação")
    await filtro.selectOption("A conferir")
    await expect(page.getByText("0 de 0")).toBeVisible()
    const linhas = page.getByRole("listitem")
    await expect(linhas).toHaveCount(2, { timeout: 12_000 })
    await linhas.first().getByRole("button", { name: "Confirmar entrada" }).click()
    await expect(linhas).toHaveCount(1)
    await linhas.first().getByRole("button", { name: "Encerrar sem aceite" }).click()
    await expect(page.getByText("0 de 0")).toBeVisible()
    await filtro.selectOption("Prazo encerrado")
    await expect(linhas).toHaveCount(1)
    await expect(linhas.locator(".historico-vistoria")).toHaveText("Enviado por Joana")
    await filtro.selectOption("Finalizados")
    await expect(linhas).toHaveCount(2)
    await expect(linhas.first()).toContainText("Entrada confirmada")
    await expect(linhas.last()).toContainText("Prazo encerrado")
    await expect(linhas.getByRole("button")).toHaveCount(0)
    const { nome, telefone } = pessoas[1].pedido
    expect((await page.request.post("/api/pedidos", { data: { nome, telefone } })).ok()).toBe(true)
    await filtro.selectOption("Todos")
    await expect(linhas).toHaveCount(3)
    await expect(linhas.last()).toContainText("Para analisar")
    expect((await pessoas[1].linhas())[0].encerrado_por).toBe(contas.segunda.id)
  } finally {
    await Promise.all(pessoas.map(caso => caso.limpar()))
    await contas.limpar()
  }
})
