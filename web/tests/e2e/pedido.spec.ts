import { expect } from "@playwright/test"
import { test as base } from "../support/playwright"
import { usarCasoPedido, type CasoPedido } from "../support/pedidos"

const test = base.extend<{ caso: CasoPedido }>({ caso: async ({}, usar) => usarCasoPedido(usar) })
const confirmacao = "Recebemos seu pedido para entrar na Meet Up Tech SP."

test("a landing encaminha o participante ao formulário da comunidade", async ({ page }) => {
  expect((await page.request.get("/organizadores", { maxRedirects: 0 })).headers().location).toBe("/")
  await page.goto("/")
  const participar = page.getByRole("link", { name: "Pedir entrada na Meet Up Tech SP" })
  await expect(participar).toHaveAttribute("href", "/participar/meet-up-tech-sp")
  await participar.click()
  await expect(page.getByRole("heading", { name: "Pedir entrada na Meet Up Tech SP" })).toBeVisible()
  await expect(page.locator('a[href="/entrar"]')).toHaveCount(0)
})

test("o pedido pelo link do evento registra a origem na fila da comunidade", async ({ page, caso }) => {
  await page.goto("/participar/meet-up-tech-sp?origem=workshop-ia-novembro")
  await page.getByLabel("Como você quer ser chamado?").fill(caso.pedido.nome)
  await page.getByLabel("WhatsApp com DDD").fill(caso.pedido.telefone)
  await page.getByRole("button", { name: "Enviar pedido" }).click()
  await expect(page.getByText(confirmacao)).toBeVisible()
  expect(await caso.linhas()).toEqual([expect.objectContaining({
    comunidade: "meet-up-tech-sp", origem: "workshop-ia-novembro",
  })])
  await page.request.post("/api/pedidos/meet-up-tech-sp?origem=outra-edicao", { data: caso.pedido })
  expect(await caso.linhas()).toEqual([expect.objectContaining({ origem: "workshop-ia-novembro" })])
})

test("uma origem ambígua mantém o pedido no link geral", async ({ request, caso }) => {
  const resposta = await request.post("/api/pedidos/meet-up-tech-sp?origem=evento-a&origem=evento-b", { data: caso.pedido })
  expect(resposta.ok()).toBe(true)
  expect(await caso.linhas()).toEqual([expect.objectContaining({ comunidade: "meet-up-tech-sp", origem: "Link geral" })])
})

test("um endereço de fila desconhecido não recebe pedidos", async ({ request, caso }) => {
  expect((await request.get("/participar/sem-cadastro")).status()).toBe(404)
  expect((await request.post("/api/pedidos/sem-cadastro", { data: caso.pedido })).status()).toBe(404)
  expect(await caso.linhas()).toHaveLength(0)
})

test("envia pelo link geral no celular", async ({ page, caso }) => {
  const { nome, telefone } = caso.pedido
  await page.goto("/participar/meet-up-tech-sp")
  await page.getByLabel("Como você quer ser chamado?").fill(nome)
  await page.getByLabel("WhatsApp com DDD").fill(telefone)
  await page.getByRole("button", { name: "Enviar pedido" }).click()
  await expect(page.getByText(confirmacao, { exact: true })).toBeVisible()
  await expect(page.getByText("Se seu pedido for aprovado, a equipe vai chamar você pelo WhatsApp quando chegar a sua vez.")).toBeVisible()
  expect(await caso.linhas()).toEqual([expect.objectContaining(caso.pedido)])
})

test("recupera a confirmação após perder a resposta", async ({ page, caso }) => {
  const { nome, telefone } = caso.pedido
  await page.goto("/participar/meet-up-tech-sp")
  const campoNome = page.getByLabel("Como você quer ser chamado?")
  const campoTelefone = page.getByLabel("WhatsApp com DDD")
  const campoMotivacao = page.getByLabel("O que você busca na Meet Up Tech SP?")
  const enviar = page.getByRole("button", { name: "Enviar pedido" })
  await campoNome.fill(nome)
  await campoTelefone.fill(telefone)
  await campoMotivacao.fill("Aprender")
  await page.route("**/api/pedidos/meet-up-tech-sp", async route => {
    const resposta = await route.fetch()
    expect(resposta.status()).toBe(200)
    await route.abort("failed")
  }, { times: 1 })
  await enviar.click()
  await expect(page.locator("form").getByRole("alert")).toHaveText("Não foi possível guardar seu pedido. Tente enviar novamente.")
  await expect(campoNome).toHaveValue(nome)
  await expect(campoTelefone).toHaveValue(telefone)
  await expect(campoMotivacao).toHaveValue("Aprender")
  const antes = await caso.linhas()
  expect(antes).toEqual([expect.objectContaining({ nome, telefone, motivacao: "Aprender" })])
  await enviar.click()
  await expect(page.getByText(confirmacao, { exact: true })).toBeVisible()
  expect(await caso.linhas()).toEqual(antes)
})

test("API rejeita entrada inválida e confirma reenvios com o mesmo corpo", async ({ request, caso }) => {
  const { telefone } = caso.pedido
  const invalida = await request.post("/api/pedidos", { data: { nome: "Ana", telefone: "abc" } })
  expect(invalida.status()).toBe(422)
  expect(await invalida.json()).toEqual({ campos: { telefone: "Informe um WhatsApp com DDD, por exemplo (11) 91234-5678." } })
  const ilegivel = await request.post("/api/pedidos", { data: "{" })
  expect(ilegivel.status()).toBe(400)
  for (const nome of [caso.pedido.nome, caso.outroNome]) {
    const resposta = await request.post("/api/pedidos", { data: { nome, telefone } })
    expect(resposta.status()).toBe(200)
    expect(await resposta.json()).toEqual({ recebido: true })
  }
  expect(await caso.linhas()).toEqual([expect.objectContaining(caso.pedido)])
})

test("503 conserva o pedido para uma nova tentativa", async ({ page, caso }) => {
  await page.goto("/participar/meet-up-tech-sp")
  await page.getByLabel("Como você quer ser chamado?").fill(caso.pedido.nome)
  await page.getByLabel("WhatsApp com DDD").fill(caso.pedido.telefone)
  await page.route("**/api/pedidos/meet-up-tech-sp", route => route.fulfill({ status: 503, json: { erro: "indisponivel" } }), { times: 1 })
  const enviar = page.getByRole("button", { name: "Enviar pedido" })
  await enviar.click()
  await expect(page.locator("form").getByRole("alert")).toHaveText("Não foi possível guardar seu pedido. Tente enviar novamente.")
  await enviar.click()
  await expect(page.getByText(confirmacao, { exact: true })).toBeVisible()
})

test("mostra o erro junto ao WhatsApp no desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/participar/meet-up-tech-sp")
  await page.getByLabel("Como você quer ser chamado?").fill("Ana")
  const campo = page.getByLabel("WhatsApp com DDD")
  await campo.fill("abc")
  await page.getByRole("button", { name: "Enviar pedido" }).click()
  await expect(campo).toHaveAccessibleDescription("Informe um WhatsApp com DDD, por exemplo (11) 91234-5678.")
  await expect(campo).toBeFocused()
})
