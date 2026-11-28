import { randomInt, randomUUID } from "node:crypto"
import { expect } from "@playwright/test"
import { test } from "../support/playwright"
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

test("os indicadores abrem a fila correspondente e comparam a mesma coorte por origem", async ({ page }) => {
  const contas = await criarOperadores()
  try {
    await semear("Jo")
    await fazerLogin(page, contas.leitora)
    const pendencias = page.getByRole("region", { name: "Pendências da fila" })
    await pendencias.getByRole("button", { name: /^Para analisar, \d+/ }).click()
    await expect(page.getByLabel("Situação", { exact: true })).toHaveValue("Para analisar")
    await expect(page.getByRole("heading", { name: "Pedidos da fila" })).toBeFocused()
    await page.getByLabel("Pesquisar").fill(marcador)
    await expect(page.getByRole("listitem")).toContainText("Jo")

    const grafico = page.getByRole("region", { name: "Resultados dos pedidos" })
    const resposta = page.waitForResponse(resp => resp.url().endsWith("/api/fila/resumo?dias=30") && resp.ok())
    await grafico.getByRole("button", { name: "30 dias" }).click()
    await resposta
    await grafico.getByRole("tab", { name: "Por divulgação" }).click()
    await expect(grafico.getByRole("tabpanel")).toContainText("Entradas confirmadas por origem")
    await grafico.getByRole("tab", { name: "Etapas da fila" }).click()
    const rotulo = grafico.locator("svg text").filter({ hasText: /^Entradas confirmadas$/ })
    await expect(rotulo).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const margemEsquerda = await rotulo.evaluate(texto =>
      texto.getBoundingClientRect().left - texto.closest("svg")!.getBoundingClientRect().left)
    expect(margemEsquerda).toBeGreaterThanOrEqual(0)
  } finally { await contas.limpar() }
})

test("mantém a leitura e a altura do gráfico ao trocar as abas e aguardar outro período", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  const contas = await criarOperadores()
  let responder!: () => void
  const espera = new Promise<void>(resolve => { responder = resolve })
  await page.route("**/api/fila/resumo?*", async rota => {
    const mes = new URL(rota.request().url()).searchParams.get("dias") === "30"
    if (mes) await espera
    const confirmadas = mes ? [6, 5, 4, 2, 1] : [2, 1, 1, 1, 0]
    await rota.fulfill({ json: {
      dias: mes ? 30 : 7,
      atuais: { paraAnalisar: 3, aguardandoVaga: 2, chamadaIniciada: 1, aConferir: 1, esperaMaisAntigaMs: 7200000 },
      funil: mes ? { recebidos: 45, aprovados: 33, convitesEnviados: 28, entradasConfirmadas: 18 }
        : { recebidos: 20, aprovados: 11, convitesEnviados: 9, entradasConfirmadas: 5 },
      divulgacoes: confirmadas.map((entradasConfirmadas, i) => ({ nome: "Canal " + (i + 1), pedidos: mes ? 9 : 4, entradasConfirmadas })),
      atualizarEmMs: null,
    } })
  })
  try {
    await fazerLogin(page, contas.leitora)
    const leitura = page.getByRole("region", { name: "Quantos pedidos viraram entrada?" })
    const grafico = page.getByRole("region", { name: "Resultados dos pedidos" })
    const etapas = grafico.getByRole("tab", { name: "Etapas da fila" })
    const origens = grafico.getByRole("tab", { name: "Por divulgação" })
    const painel = grafico.getByRole("tabpanel")
    const tituloLista = page.getByRole("heading", { name: "Pedidos da fila" })
    const posicaoLista = () => tituloLista.evaluate(el => el.getBoundingClientRect().top + window.scrollY)
    const alturaGrafico = () => grafico.evaluate(el => el.getBoundingClientRect().height)
    await expect(leitura).toContainText("25%")
    await expect(painel.locator("dd")).toHaveText(["20", "11", "9", "5"])
    await page.evaluate(() => document.fonts.ready)
    const alturaInicial = await alturaGrafico()
    const topoInicial = await posicaoLista()
    await origens.click()
    await expect(painel.getByText(/^Canal \d+$/)).toHaveCount(5)
    expect.soft(Math.abs(await alturaGrafico() - alturaInicial)).toBeLessThanOrEqual(1)
    expect.soft(Math.abs(await posicaoLista() - topoInicial)).toBeLessThanOrEqual(1)
    await expect.soft(grafico.getByText(/Pedidos recebidos nos últimos \d+ dias/i)).toHaveCount(0, { timeout: 1000 })

    const requisicao = page.waitForRequest(req => req.url().endsWith("/api/fila/resumo?dias=30"))
    await grafico.getByRole("button", { name: "30 dias" }).click()
    await requisicao
    await expect.soft(leitura).toContainText("25%", { timeout: 1000 })
    await expect.soft(painel.getByText("2 de 4 pedidos")).toBeVisible({ timeout: 1000 })
    await etapas.click()
    await expect.soft(painel.locator("dd")).toHaveText(["20", "11", "9", "5"], { timeout: 1000 })
    await expect.soft(painel.locator("svg text").filter({ hasText: /^20$/ })).toBeVisible({ timeout: 1000 })

    // Amostra as mudanças do percentual exibido para detectar contagem animada mesmo com o movimento reduzido.
    const monitor = await leitura.evaluateHandle((el: HTMLElement) => {
      const valores = new Set<string>()
      const registrar = () => {
        for (const percentual of el.innerText.match(/\d+\s*%/g) ?? []) valores.add(percentual.replace(/\s/g, ""))
      }
      const observador = new MutationObserver(registrar)
      observador.observe(el, { childList: true, subtree: true, characterData: true })
      return { valores, observador }
    })
    responder()
    await expect(leitura).toContainText("18 de 45")
    await expect(leitura).toContainText("40%")
    await expect(painel.locator("dd")).toHaveText(["45", "33", "28", "18"])
    const percentuais = await monitor.evaluate(async ({ valores, observador }) => {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      observador.disconnect()
      return [...valores]
    })
    expect(percentuais).toContain("40%")
    expect(percentuais.filter(valor => valor !== "25%" && valor !== "40%")).toEqual([])
    await origens.click()
    await expect(painel.getByText("6 de 9 pedidos")).toBeVisible()
    await expect(painel.getByText(/^Canal \d+$/)).toHaveCount(5)
    expect.soft(Math.abs(await alturaGrafico() - alturaInicial)).toBeLessThanOrEqual(1)
    expect.soft(Math.abs(await posicaoLista() - topoInicial)).toBeLessThanOrEqual(1)
  } finally {
    responder()
    await contas.limpar()
  }
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
      await page.goto("/participar/meet-up-tech-sp")
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
