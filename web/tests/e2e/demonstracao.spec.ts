import { expect } from "@playwright/test"
import { usarCasoDemonstracao, type CasoDemonstracao } from "../support/demonstracao"
import { test as base } from "../support/playwright"

const test = base.extend<{ caso: CasoDemonstracao }>({
  caso: async ({}, usar) => usarCasoDemonstracao(usar),
})
const confirmacao = "Você entrou na fila da demonstração do OrbCommu. Agora é só aguardar."

test("reenviar após perder a resposta preserva a primeira inscrição", async ({ page, caso }) => {
  await page.goto("/organizadores")
  await page.getByRole("button", { name: "Entrar na fila da demonstração", exact: true }).first().click()
  const dialogo = page.getByRole("dialog")
  const contato = dialogo.getByRole("textbox", { name: "E-mail" })
  const enviar = dialogo.getByRole("button", { name: "Entrar na fila" })
  await contato.fill(caso.email)
  await page.route("**/api/demonstracao", async rota => {
    const resposta = await rota.fetch()
    expect(resposta.status()).toBe(200)
    await rota.abort("failed")
  }, { times: 1 })

  await enviar.click()
  await expect(contato).toHaveValue(caso.email)
  await expect(dialogo.getByRole("alert")).toBeVisible()
  const antesDeReenviar = await caso.linhas()
  expect(antesDeReenviar).toHaveLength(1)
  await enviar.click()
  await expect(dialogo.getByText(confirmacao)).toBeVisible()
  expect(await caso.linhas()).toEqual(antesDeReenviar)
})

test("trocar para WhatsApp envia apenas o telefone e Escape devolve o foco", async ({ page, caso }) => {
  await page.goto("/organizadores")
  const botaoDeOrigem = page.getByRole("button", { name: "Entrar na fila da demonstração", exact: true }).first()
  await botaoDeOrigem.click()
  const dialogo = page.getByRole("dialog")
  const email = dialogo.getByRole("textbox", { name: "E-mail" })
  await email.fill(caso.email)
  await dialogo.getByRole("radio", { name: "WhatsApp" }).check()
  await expect(email).toHaveCount(0)
  await dialogo.getByRole("textbox", { name: "WhatsApp com DDD" }).fill(caso.telefone)
  const [requisicao] = await Promise.all([
    page.waitForRequest(req => req.method() === "POST" && req.url().endsWith("/api/demonstracao")),
    dialogo.getByRole("button", { name: "Entrar na fila" }).click(),
  ])
  expect(requisicao.postDataJSON()).toEqual({
    canal: "whatsapp",
    contato: caso.telefone,
    interesse: "demonstracao",
  })
  await expect(dialogo.getByText(confirmacao)).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialogo).toBeHidden()
  await expect(botaoDeOrigem).toBeFocused()
})
