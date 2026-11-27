import { expect, test } from "@playwright/test"
import { banco } from "../support/banco"

const telefone = "5511900000310"
const confirmacao = "Recebemos seu pedido para entrar na Meet Up Tech SP."
const filtro = ["meet-up-tech-sp", telefone]
const linhas = async () => (await banco.query(
  "select * from orbcommu.pedidos where comunidade = $1 and telefone = $2", filtro,
)).rows

test.afterEach(async () => {
  await banco.query("delete from orbcommu.pedidos where comunidade = $1 and telefone = $2", filtro)
})
test.afterAll(async () => { await banco.end() })

test("envia pelo link geral no celular", async ({ page }) => {
  await page.goto("/")
  await page.getByLabel("Como você quer ser chamado?").fill("Ana")
  await page.getByLabel("WhatsApp com DDD").fill(telefone)
  await page.getByRole("button", { name: "Enviar pedido" }).click()
  await expect(page.getByText(confirmacao, { exact: true })).toBeVisible()
  await expect(page.getByText("Se seu pedido for aprovado, a equipe vai chamar você pelo WhatsApp quando chegar a sua vez.")).toBeVisible()
  expect(await linhas()).toEqual([expect.objectContaining({ nome: "Ana", telefone, motivacao: null })])
})

test("recupera a confirmação após perder a resposta", async ({ page }) => {
  await page.goto("/")
  const campoNome = page.getByLabel("Como você quer ser chamado?")
  const campoTelefone = page.getByLabel("WhatsApp com DDD")
  const campoMotivacao = page.getByLabel("O que você busca na Meet Up Tech SP?")
  const enviar = page.getByRole("button", { name: "Enviar pedido" })
  await campoNome.fill("Ana")
  await campoTelefone.fill(telefone)
  await campoMotivacao.fill("Aprender")
  await page.route("**/api/pedidos", async route => {
    const resposta = await route.fetch()
    expect(resposta.status()).toBe(200)
    await route.abort("failed")
  }, { times: 1 })
  await enviar.click()
  await expect(page.locator("form").getByRole("alert")).toHaveText("Não foi possível guardar seu pedido. Tente enviar novamente.")
  await expect(campoNome).toHaveValue("Ana")
  await expect(campoTelefone).toHaveValue(telefone)
  await expect(campoMotivacao).toHaveValue("Aprender")
  const antes = await linhas()
  expect(antes).toEqual([expect.objectContaining({ nome: "Ana", telefone, motivacao: "Aprender" })])
  await enviar.click()
  await expect(page.getByText(confirmacao, { exact: true })).toBeVisible()
  expect(await linhas()).toEqual(antes)
})

test("API rejeita entrada inválida e confirma reenvios com o mesmo corpo", async ({ request }) => {
  const invalida = await request.post("/api/pedidos", { data: { nome: "Ana", telefone: "abc" } })
  expect(invalida.status()).toBe(422)
  expect(await invalida.json()).toEqual({ campos: { telefone: "Informe um WhatsApp com DDD, por exemplo (11) 91234-5678." } })
  const ilegivel = await request.post("/api/pedidos", { data: "{" })
  expect(ilegivel.status()).toBe(400)
  for (const nome of ["Ana", "Bea"]) {
    const resposta = await request.post("/api/pedidos", { data: { nome, telefone } })
    expect(resposta.status()).toBe(200)
    expect(await resposta.json()).toEqual({ recebido: true })
  }
  expect(await linhas()).toEqual([expect.objectContaining({ nome: "Ana", telefone })])
})

test("503 conserva o pedido para uma nova tentativa", async ({ page }) => {
  await page.goto("/")
  await page.getByLabel("Como você quer ser chamado?").fill("Ana")
  await page.getByLabel("WhatsApp com DDD").fill(telefone)
  await page.route("**/api/pedidos", route => route.fulfill({ status: 503, json: { erro: "indisponivel" } }), { times: 1 })
  const enviar = page.getByRole("button", { name: "Enviar pedido" })
  await enviar.click()
  await expect(page.locator("form").getByRole("alert")).toHaveText("Não foi possível guardar seu pedido. Tente enviar novamente.")
  await enviar.click()
  await expect(page.getByText(confirmacao, { exact: true })).toBeVisible()
})

test("mostra o erro junto ao WhatsApp no desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/")
  await page.getByLabel("Como você quer ser chamado?").fill("Ana")
  const campo = page.getByLabel("WhatsApp com DDD")
  await campo.fill("abc")
  await page.getByRole("button", { name: "Enviar pedido" }).click()
  await expect(campo).toHaveAccessibleDescription("Informe um WhatsApp com DDD, por exemplo (11) 91234-5678.")
  await expect(campo).toBeFocused()
})
