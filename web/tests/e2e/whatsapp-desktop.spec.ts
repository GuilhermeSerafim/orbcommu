import { randomUUID } from "node:crypto"
import { expect } from "@playwright/test"
import { banco } from "../support/banco"
import { comFixtureConvite } from "../support/convite"
import { criarOperadores, fazerLogin } from "../support/operadores"
import { criarCasoPedido } from "../support/pedidos"
import { test } from "../support/playwright"

test.use({ viewport: { width: 1280, height: 800 } })

test("chama pelo aplicativo e confirma os envios diretamente na fila", async ({ page, context }) => {
  const contas = await criarOperadores()
  const busca = randomUUID()
  const pessoas = [criarCasoPedido(busca), criarCasoPedido(busca)]
  try {
    await comFixtureConvite("meet-up-tech-sp", async convite => {
      await banco.query("insert into orbcommu.convites_do_grupo values ('meet-up-tech-sp',$1) on conflict (comunidade) do update set convite = excluded.convite", [convite])
      for (const { pedido } of pessoas) {
        await banco.query("insert into orbcommu.pedidos (comunidade,nome,telefone,motivacao,origem,situacao) values ('meet-up-tech-sp',$1,$2,$3,'Link geral','Aguardando vaga')", [pedido.nome, pedido.telefone, busca])
      }
      await page.addInitScript(() => document.addEventListener("click", evento => {
        const link = evento.target
        if (link instanceof HTMLAnchorElement && link.protocol === "whatsapp:") {
          evento.preventDefault()
          document.documentElement.dataset.atalhoWhatsApp = link.href
        }
      }, true))
      await fazerLogin(page, contas.primeira)
      await page.goto("/fila?pedido=1")
      await expect(page).toHaveURL(/\/fila$/)
      await page.getByLabel("Pesquisar").fill(busca)
      await page.getByLabel("Situação").selectOption("Aguardando vaga")
      await expect(page.getByRole("listitem")).toHaveCount(2)
      for (const { pedido } of pessoas) {
        const linha = page.getByRole("listitem").filter({ hasText: pedido.nome })
        await linha.getByRole("button", { name: "Chamar", exact: true }).click()
        const raiz = page.locator("html")
        await expect(raiz).toHaveAttribute("data-atalho-whats-app", new RegExp("^whatsapp://send\\?phone=" + pedido.telefone + "&"))
        const mensagem = new URL((await raiz.getAttribute("data-atalho-whats-app"))!).searchParams.get("text")
        expect(mensagem).toContain(convite)
        expect(mensagem).toContain("24 horas")
        expect(context.pages()).toHaveLength(1)
        await expect(page).toHaveURL(/\/fila$/)
        await expect(linha.getByRole("button", { name: "Confirmar envio" })).toBeVisible()
        await expect(page.getByRole("listitem")).toHaveCount(2)
      }
      for (const { pedido } of pessoas) {
        const linha = page.getByRole("listitem").filter({ hasText: pedido.nome })
        await linha.getByRole("button", { name: "Confirmar envio" }).click()
        await expect(linha).toHaveCount(0)
        await expect(page.getByLabel("Pesquisar")).toHaveValue(busca)
        await expect(page.getByLabel("Situação")).toHaveValue("Aguardando vaga")
      }
      await page.getByLabel("Situação").selectOption("Convite enviado")
      await expect(page.getByRole("listitem")).toHaveCount(2)
    })
  } finally {
    await Promise.all(pessoas.map(pessoa => pessoa.limpar()))
    await contas.limpar()
  }
})
