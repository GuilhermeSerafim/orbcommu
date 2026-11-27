import { expect } from "@playwright/test"
import { usarCasoDemonstracao, type CasoDemonstracao } from "../support/demonstracao"
import { test as base } from "../support/playwright"

const test = base.extend<{ caso: CasoDemonstracao }>({
  caso: async ({}, usar) => usarCasoDemonstracao(usar),
})

const links = {
  "Como funciona": "como-funciona",
  Distribuição: "distribuicao",
  Relatórios: "relatorios",
  Planos: "planos",
  Dúvidas: "duvidas",
}

test("todos os caminhos levam ao destino indicado", async ({ page, caso }) => {
  await page.goto("/organizadores")
  const cabecalho = page.getByRole("navigation", { name: "Seções" })
  const rodape = page.getByRole("navigation", { name: "Rodapé" })

  for (const [nome, id] of Object.entries(links)) {
    for (const nav of nome === "Como funciona" ? [cabecalho] : [cabecalho, rodape]) {
      await nav.getByRole("link", { name: nome, exact: true }).click()
      expect(new URL(page.url()).hash).toBe(`#${id}`)
      await expect(page.locator(`#${id}`)).toBeInViewport()
    }
  }

  for (const comparar of await page.getByRole("link", { name: "Comparar planos" }).all()) {
    await comparar.click()
    expect(new URL(page.url()).hash).toBe("#planos")
  }
  await expect(page.getByText("Sob consulta", { exact: true })).toBeVisible()
  const perguntas = page.locator("#duvidas details")
  await expect(perguntas).toHaveCount(6)
  for (const pergunta of await perguntas.all()) {
    await expect(pergunta.locator("p")).toBeHidden()
    await pergunta.locator("summary").press("Enter")
    await expect(pergunta.locator("p")).toBeVisible()
  }

  const dialogo = page.getByRole("dialog")
  const demonstracoes = page.getByRole("button", { name: "Solicitar demonstração" })
  await expect(demonstracoes).toHaveCount(4)
  for (const botao of await demonstracoes.all()) {
    await botao.click()
    await expect(dialogo.getByRole("heading", { name: "Solicitar demonstração" })).toBeVisible()
    await expect(dialogo.getByText("Você selecionou a opção Por edição.", { exact: false })).toHaveCount(0)
    await page.keyboard.press("Escape")
    await expect(botao).toBeFocused()
  }

  const edicao = page.getByRole("button", { name: "Tenho interesse por edição" })
  await edicao.click()
  await expect(dialogo.getByText("Você selecionou a opção Por edição.", { exact: false })).toBeVisible()
  await dialogo.getByRole("textbox", { name: "E-mail" }).fill(caso.email)
  await dialogo.getByRole("button", { name: "Entrar na fila" }).click()
  await expect(dialogo.getByText("Você entrou na fila da demonstração do OrbCommu. Agora é só aguardar.")).toBeVisible()
  expect((await caso.linhas()).map(linha => linha.interesse)).toEqual(["edicao"])
  await dialogo.getByRole("button", { name: "Voltar à página" }).click()
  await expect(edicao).toBeFocused()

  await page.getByRole("contentinfo").getByRole("link", { name: "OrbCommu", exact: true }).click()
  expect(new URL(page.url()).hash).toBe("#inicio")
  await expect(rodape.getByRole("link", { name: "Entrar como equipe" })).toHaveAttribute("href", "/entrar")
  await cabecalho.getByRole("link", { name: "Entrar como equipe" }).click()
  await expect(page).toHaveURL(/\/entrar$/)
})

test("percorrer as simulações não envia pedidos", async ({ page }) => {
  const posts: string[] = []
  page.on("request", pedido => {
    if (pedido.method() === "POST") posts.push(pedido.url())
  })
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.clock.install()
  await page.goto("/organizadores")
  const controlesRemovidos = [
    "Pausar animação", "Retomar animação", "Pausar", "Continuar", "Avançar",
    "Avançar uma pessoa", "Reiniciar", "Recomeçar", "Simular envio",
  ]
  for (const nome of controlesRemovidos) {
    await expect(page.getByRole("button", { name: nome, exact: true })).toHaveCount(0)
  }
  await expect(page.locator("#relatorios").getByText(/A origem acompanha o link da divulgação/)).toHaveCount(0)
  await page.getByRole("button", { name: "Fila", exact: true }).click()
  await page.getByRole("button", { name: "Aprovar Ana" }).click()
  const distribuicao = page.getByRole("region", { name: "Como os grupos enchem?" })
  await distribuicao.scrollIntoViewIfNeeded()
  await page.clock.runFor(2400)
  await expect(distribuicao.getByText(/^Chegadas simuladas · \d+$/)).toBeVisible()
  await page.getByRole("combobox", { name: "Edição de exemplo" }).selectOption("out")

  await expect(page.getByText("Conversa de exemplo · Ana", { exact: true })).toHaveCount(0)
  const operacao = page.getByRole("region", { name: "A operação da sua comunidade", exact: true })
  await expect(operacao.getByText("OrbCommu", { exact: true })).toBeVisible()
  const origem = operacao.getByRole("button", { name: "Link da comunidade, 25 aberturas" })
  await origem.click()
  await expect(origem).toHaveAttribute("aria-pressed", "true")
  await expect(operacao.getByText("25 aberturas", { exact: true })).toBeVisible()
  const dia = operacao.getByRole("slider", { name: "Dia da edição", exact: true })
  await expect(dia).toHaveAttribute("type", "range")
  await dia.press("End")
  await expect(dia).toHaveAttribute("aria-valuetext", "22 de novembro, 12 entradas confirmadas")
  await dia.press("Home")
  await expect(dia).toHaveAttribute("aria-valuetext", "16 de novembro, 1 entrada confirmada")
  expect(posts).toEqual([])
})

test("reabrir imediatamente mantém o novo formulário quando o envio anterior termina", async ({ page, caso }) => {
  let liberarResposta!: () => void
  const respostaAnterior = new Promise<void>(resolver => { liberarResposta = resolver })
  let pedidoEmEspera!: () => void
  const pedidoAnterior = new Promise<void>(resolver => { pedidoEmEspera = resolver })
  let respostaEntregue!: () => void
  const tentativaDeEntrega = new Promise<void>(resolver => { respostaEntregue = resolver })
  await page.route("**/api/demonstracao", async rota => {
    pedidoEmEspera()
    await respostaAnterior
    try {
      await rota.fulfill({ json: { recebido: true } })
    } finally {
      respostaEntregue()
    }
  }, { times: 1 })

  await page.goto("/organizadores")
  const inicial = page.getByRole("button", { name: "Solicitar demonstração" }).first()
  await inicial.click()
  const dialogo = page.getByRole("dialog")
  await dialogo.getByRole("textbox", { name: "E-mail" }).fill(caso.email)
  await dialogo.getByRole("button", { name: "Entrar na fila" }).click()
  await pedidoAnterior

  try {
    // A nova abertura acontece antes de o navegador entregar o evento close anterior.
    await inicial.evaluate((botao: HTMLButtonElement) => {
      document.querySelector("dialog")!.close()
      botao.click()
    })
    await expect(dialogo).toBeVisible()
    const novoContato = dialogo.getByRole("textbox", { name: "E-mail" })
    await expect(novoContato).toBeEditable()
    await expect(novoContato).toHaveValue("")
    await novoContato.fill(`novo-${caso.email}`)
    liberarResposta()
    await tentativaDeEntrega
    await expect(novoContato).toHaveValue(`novo-${caso.email}`)
    await expect(dialogo.getByRole("heading", { name: "Solicitar demonstração" })).toBeVisible()
  } finally {
    liberarResposta()
  }
})
