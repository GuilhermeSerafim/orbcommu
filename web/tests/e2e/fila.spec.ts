import { randomInt, randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import { banco } from "../support/banco"
import { criarOperadores, fazerLogin } from "../support/operadores"

test.describe.configure({ timeout: 90_000 })
const comunidade = "meet-up-tech-sp"
const marcador = randomUUID()
const ids: string[] = []
const numero = () => "55119" + String(randomInt(100000000)).padStart(8, "0")
async function semear(nome: string) {
  const telefone = numero()
  const { rows } = await banco.query(
    `insert into orbcommu.pedidos(comunidade,nome,telefone,origem,situacao)
     values ($1,$2,$3,'Link geral','Para analisar') returning id`,
    [comunidade, nome + " " + marcador, telefone],
  )
  ids.push(rows[0].id)
  return telefone
}

test.afterEach(async () => {
  await banco.query("delete from orbcommu.pedidos where id = any($1::bigint[])", [ids.splice(0)])
})
test.afterAll(async () => { await banco.end() })

test("protege também o total filtrado", async ({ page, browser, request }) => {
  await semear("Ana")
  const contas = await criarOperadores()
  const recusada = await browser.newPage()
  const url = "/api/fila?busca=" + marcador
  try {
    await fazerLogin(page, contas.leitora)
    await expect(page.getByRole("heading", { name: "Fila de entrada" })).toBeVisible()
    await fazerLogin(recusada, contas.semVinculo)
    await expect(recusada.getByRole("heading", { name: "Acesso recusado" })).toBeVisible()
    const autorizada = await page.request.get(url)
    expect(autorizada.status()).toBe(200)
    expect(autorizada.headers()["cache-control"]).toBe("private, no-store")
    expect((await autorizada.json()).total).toBe(1)
    for (const [cliente, status] of [[request, 401], [recusada.request, 403]] as const) {
      const res = await cliente.get(url)
      expect(res.status()).toBe(status)
      expect(await res.json()).toEqual({ erro: "acesso" })
      expect(res.headers()["cache-control"]).toBe("private, no-store")
    }
  } finally {
    await recusada.close()
    await contas.limpar()
  }
})

test("busca a partir da página dois", async ({ page }) => {
  const contas = await criarOperadores()
  try {
    const telefone = await semear("Ana")
    for (let i = 1; i < 6; i++) await semear("Bia " + i)
    await fazerLogin(page, contas.primeira)
    const busca = page.getByLabel("Pesquisar")
    await busca.fill(marcador)
    await expect(page.getByText("1–5 de 6")).toBeVisible()
    await page.getByRole("button", { name: "Próxima página" }).click()
    await expect(page.getByText("6–6 de 6")).toBeVisible()
    await page.getByLabel("Situação").selectOption("Para analisar")
    await page.getByRole("button", { name: "Próxima página" }).click()
    await expect(page.getByText("6–6 de 6")).toBeVisible()
    await busca.fill("(11) " + telefone.slice(4,9) + "-" + telefone.slice(9))
    await expect(page.getByText("1–1 de 1")).toBeVisible()
    await expect(page.getByRole("listitem")).toContainText("Ana")
    await busca.fill("ausente-" + marcador)
    await expect(page.getByText("0 de 0")).toBeVisible()
  } finally { await contas.limpar() }
})

test("descarta resposta atrasada e limpa a fila ao perder o acesso", async ({ page }) => {
  const contas = await criarOperadores()
  let liberar!: () => void
  const bloqueio = new Promise<void>(resolve => { liberar = resolve })
  let concluir!: () => void
  const antigaConcluida = new Promise<void>(resolve => { concluir = resolve })
  try {
    await semear("Ana")
    await fazerLogin(page, contas.primeira)
    const busca = page.getByLabel("Pesquisar")
    await busca.fill(marcador)
    await expect(page.getByText("1–1 de 1")).toBeVisible()
    const antiga = page.waitForRequest(req => new URL(req.url()).searchParams.get("busca") === "atrasada")
    await page.route("**/api/fila?**", async route => {
      if (new URL(route.request().url()).searchParams.get("busca") === "atrasada") {
        const resposta = await route.fetch()
        await bloqueio
        try { await route.fulfill({ response: resposta }) } finally { concluir() }
      } else await route.continue()
    })
    await busca.fill("atrasada")
    await antiga
    await busca.fill(marcador)
    await expect(page.getByText("1–1 de 1")).toBeVisible()
    liberar()
    await antigaConcluida
    await expect(page.getByText("1–1 de 1")).toBeVisible()
    await page.context().clearCookies()
    await busca.fill("outra")
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Esta sessão não tem acesso")
    await expect(page.getByRole("listitem")).toHaveCount(0)
    await expect(page.getByText("1–1 de 1")).toHaveCount(0)
  } finally {
    liberar()
    await contas.limpar()
  }
})

test("compartilha o pedido entre dois operadores", async ({ browser, page }) => {
  const contas = await criarOperadores()
  const primeira = await browser.newPage()
  const segunda = await browser.newPage()
  const telefone = numero()
  const nome = "Ana " + marcador
  try {
    for (const entrada of [nome, "Bea " + marcador]) {
      await page.goto("/")
      await page.getByLabel("Como você quer ser chamado?").fill(entrada)
      await page.getByLabel("WhatsApp com DDD").fill(telefone)
      await page.getByRole("button", { name: "Enviar pedido" }).click()
      await expect(page.getByText("Recebemos seu pedido para entrar na Meet Up Tech SP.")).toBeVisible()
    }
    const instantes: string[] = []
    for (const [painel, conta] of [[primeira, contas.primeira], [segunda, contas.segunda]] as const) {
      await fazerLogin(painel, conta)
      await expect(painel.getByRole("heading", { name: "Fila de entrada" })).toBeVisible()
      await painel.reload()
      await painel.getByLabel("Pesquisar").fill(telefone)
      const linha = painel.getByRole("listitem")
      await expect(linha).toHaveCount(1)
      for (const texto of [nome, "Link geral", "Para analisar"]) await expect(linha).toContainText(texto)
      const instante = await linha.locator("time").getAttribute("datetime")
      expect(instante).toBeTruthy()
      instantes.push(instante!)
    }
    expect(instantes[0]).toBe(instantes[1])
  } finally {
    await banco.query("delete from orbcommu.pedidos where comunidade=$1 and telefone=$2 and nome=$3", [comunidade, telefone, nome])
    await Promise.all([primeira.close(), segunda.close()])
    await contas.limpar()
  }
})
