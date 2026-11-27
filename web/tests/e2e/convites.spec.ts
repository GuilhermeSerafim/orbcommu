import { randomUUID } from "node:crypto"
import { expect } from "@playwright/test"
import { test } from "../support/playwright"
import { banco } from "../support/banco"
import { comFixtureConvite } from "../support/convite"
import { criarOperadores, fazerLogin } from "../support/operadores"
import { criarCasoPedido } from "../support/pedidos"

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
      async function abrir(rotulo: string) {
        const abriu = page.waitForEvent("popup")
        await linha.getByRole("button", { name: rotulo, exact: true }).click()
        const conversa = await abriu
        await expect(conversa).toHaveURL(url => url.hostname === "wa.me" && url.pathname === "/" + pessoas[1].pedido.telefone)
        const mensagem = new URL(conversa.url()).searchParams.get("text")
        expect(mensagem).toContain(convite)
        expect(mensagem).toMatch(/solicite entrada no grupo pelo WhatsApp em até 24 horas/i)
        expect(mensagem).toContain("perde a vez")
        await conversa.close()
      }
      await abrir("Chamar")
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

      // A gravação termina no servidor antes de o navegador perder a resposta.
      await page.route("**/fila", async route => {
        if (!route.request().headers()["next-action"]) return route.continue()
        const resposta = await route.fetch()
        expect(resposta.ok()).toBe(true)
        await route.abort("failed")
      }, { times: 1 })
      await linha.getByRole("button", { name: "Chamar", exact: true }).click()
      await expect(linha.getByRole("button", { name: "Reabrir conversa" })).toBeVisible()
      const segunda = (await registro()).reserva_id
      expect(segunda).not.toBe(primeira)
      await abrir("Reabrir conversa")
      expect((await registro()).reserva_id).toBe(segunda)
      await linha.getByRole("button", { name: "Confirmar envio" }).click()
      await expect(linha).toContainText("Convite enviado")
      await expect(linha).toContainText("Enviado por Joana")
      await expect(lista.first()).toContainText("Aguardando vaga")
    })
  } finally {
    await Promise.all(pessoas.map(pessoa => pessoa.limpar()))
    await contas.limpar()
  }
})
