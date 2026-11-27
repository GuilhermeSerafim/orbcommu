import { randomUUID } from "node:crypto"
import { expect } from "@playwright/test"
import { banco } from "../support/banco"
import { comFixtureConvite } from "../support/convite"
import { criarOperadores, fazerLogin } from "../support/operadores"
import { criarCasoPedido } from "../support/pedidos"
import { test } from "../support/playwright"

test.use({ viewport: { width: 1280, height: 800 } })

test("chama duas pessoas na mesma aba e volta ao pedido certo para confirmar o envio", async ({ page, context }) => {
  const contas = await criarOperadores()
  const busca = randomUUID()
  const pessoas = [criarCasoPedido(busca), criarCasoPedido(busca)]
  try {
    await comFixtureConvite("meet-up-tech-sp", async convite => {
      await banco.query("insert into orbcommu.convites_do_grupo values ('meet-up-tech-sp',$1) on conflict (comunidade) do update set convite = excluded.convite", [convite])
      for (const { pedido } of pessoas) {
        await banco.query("insert into orbcommu.pedidos (comunidade,nome,telefone,motivacao,origem,situacao) values ('meet-up-tech-sp',$1,$2,$3,'Link geral','Aguardando vaga')", [pedido.nome, pedido.telefone, busca])
      }
      await context.route("https://wa.me/**", route => route.abort())
      await context.route("https://web.whatsapp.com/**", route => route.fulfill({
        contentType: "text/html", headers: { "Cross-Origin-Opener-Policy": "same-origin-allow-popups" }, body: "Conversa de teste",
      }))
      await fazerLogin(page, contas.primeira)
      await page.getByLabel("Pesquisar").fill(busca)
      await page.getByLabel("Situação").selectOption("Aguardando vaga")
      for (const { pedido } of pessoas) {
        const linha = page.getByRole("listitem").filter({ hasText: pedido.nome })
        await linha.getByRole("button", { name: "Chamar", exact: true }).click()
        await expect(page).toHaveURL(url => url.origin === "https://web.whatsapp.com" && url.pathname === "/send"
          && url.searchParams.get("phone") === pedido.telefone && !!url.searchParams.get("text")?.includes(convite))
        expect(context.pages()).toHaveLength(1)
        await page.goBack()
        await expect(page.getByRole("listitem")).toHaveCount(1)
        await expect(linha.getByRole("button", { name: "Confirmar envio" })).toBeVisible()
        await linha.getByRole("button", { name: "Confirmar envio" }).click()
        await expect(linha.locator(".situacao")).toHaveText("Convite enviado")
        await page.getByRole("button", { name: "Voltar para Aguardando vaga" }).click()
        await expect(page.getByLabel("Pesquisar")).toHaveValue(busca)
        await expect(page.getByLabel("Situação")).toHaveValue("Aguardando vaga")
      }
    })
  } finally {
    await Promise.all(pessoas.map(pessoa => pessoa.limpar()))
    await contas.limpar()
  }
})
