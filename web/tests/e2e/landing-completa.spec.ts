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

const chamadaDemonstracao = "Entrar na fila da demonstração"
const notaEdicao = "Ao enviar, você entra na fila da demonstração e registra seu interesse por edição, sem agendar uma data nem contratar o serviço."

test("todos os caminhos levam ao destino indicado", async ({ page, caso }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/organizadores")
  const cabecalho = page.getByRole("navigation", { name: "Seções" })

  const percurso = ["inicio", "como-funciona", "distribuicao", "relatorios", "operacao",
    "comparacao-edicoes", "planos", "duvidas", "titulo-chamada-final"]
  const destinos = page.locator(percurso.map(id => `#${id}`).join(", "))
  expect(await destinos.evaluateAll(elementos => elementos.map(elemento => elemento.id))).toEqual(percurso)
  const chamadaFinal = page.locator('section[aria-labelledby="titulo-chamada-final"]')
  await expect(chamadaFinal.getByRole("button", { name: chamadaDemonstracao, exact: true })).toBeVisible()
  await expect(chamadaFinal.getByRole("link")).toHaveCount(0)

  const entender = page.locator("#inicio").getByRole("link", { name: "Ver como funciona", exact: true })
  await expect(entender).toHaveAttribute("href", "#como-funciona")
  await entender.click()
  expect(new URL(page.url()).hash).toBe("#como-funciona")
  const comoFunciona = page.locator("#como-funciona")
  await expect(comoFunciona).toBeInViewport()
  await expect(comoFunciona.locator("p").last()).toContainText(/três dias/i)

  for (const [nome, id] of Object.entries(links)) {
    await cabecalho.getByRole("link", { name: nome, exact: true }).click()
    expect(new URL(page.url()).hash).toBe(`#${id}`)
    await expect(page.locator(`#${id}`)).toBeInViewport()
  }

  await expect(page.getByText("Sob consulta", { exact: true })).toBeVisible()
  const faq = page.locator("#duvidas")
  const perguntas = [
    "Serve para um workshop de 20 vagas?",
    "Quem decide quem recebe o convite?",
    "E se o grupo já estiver lotado?",
    "Como sei qual divulgação trouxe cliques?",
    "Quanto custa uma edição?",
    "Quando vou ver a demonstração?",
  ]
  await expect(faq.getByRole("button")).toHaveCount(perguntas.length)
  await expect(faq.getByRole("region")).toHaveCount(0)
  await faq.getByRole("button", { name: perguntas[0], exact: true }).focus()
  for (const [indice, nome] of perguntas.entries()) {
    if (indice > 0) await page.keyboard.press("ArrowDown")
    const pergunta = faq.getByRole("button", { name: nome, exact: true })
    await expect(pergunta).toBeFocused()
    await expect(pergunta).toHaveAttribute("aria-expanded", "false")
    await page.keyboard.press("Enter")
    await expect(pergunta).toHaveAttribute("aria-expanded", "true")
    await expect(pergunta).toHaveAttribute("aria-controls", /\S+/)
    const resposta = faq.getByRole("region", { name: nome, exact: true })
    await expect(resposta).toBeVisible()
    await expect(resposta).toHaveAttribute("id", (await pergunta.getAttribute("aria-controls"))!)
    await expect(resposta).toContainText(/\S/)
  }
  await expect(faq.getByRole("region")).toHaveCount(perguntas.length)
  await page.keyboard.press("ArrowUp")
  const nomeParaFechar = perguntas[perguntas.length - 2]
  const perguntaParaFechar = faq.getByRole("button", { name: nomeParaFechar, exact: true })
  await expect(perguntaParaFechar).toBeFocused()
  await page.keyboard.press("Space")
  await expect(perguntaParaFechar).toHaveAttribute("aria-expanded", "false")
  await expect(faq.getByRole("region", { name: nomeParaFechar, exact: true })).toBeHidden()
  await expect(faq.getByRole("region")).toHaveCount(perguntas.length - 1)

  const dialogo = page.getByRole("dialog")
  const demonstracoes = page.getByRole("button", { name: chamadaDemonstracao, exact: true })
  await expect(demonstracoes).toHaveCount(4)
  for (const botao of await demonstracoes.all()) {
    await botao.click()
    await expect(dialogo.getByRole("heading", { name: "Fila da demonstração", exact: true })).toBeVisible()
    await expect(dialogo.getByText(notaEdicao, { exact: true })).toHaveCount(0)
    await page.keyboard.press("Escape")
    await expect(botao).toBeFocused()
  }

  const edicao = page.getByRole("button", { name: "Tenho interesse nesta edição", exact: true })
  await edicao.click()
  await expect(dialogo.getByRole("heading", { name: "Interesse por edição", exact: true })).toBeVisible()
  await expect(dialogo.getByText(notaEdicao, { exact: true })).toBeVisible()
  await dialogo.getByRole("textbox", { name: "E-mail" }).fill(caso.email)
  await dialogo.getByRole("button", { name: "Entrar na fila" }).click()
  await expect(dialogo.getByText("Você entrou na fila da demonstração do OrbCommu. Agora é só aguardar.")).toBeVisible()
  expect((await caso.linhas()).map(linha => linha.interesse)).toEqual(["edicao"])
  await dialogo.getByRole("button", { name: "Voltar à página" }).click()
  await expect(edicao).toBeFocused()

  await page.locator("#inicio header").getByRole("link", { name: "OrbCommu", exact: true }).click()
  expect(new URL(page.url()).hash).toBe("#inicio")
  await cabecalho.getByRole("link", { name: "Entrar como equipe" }).click()
  await expect(page).toHaveURL(/\/entrar$/)
})

test("rodapé credita Guiler e apresenta os direitos reservados", async ({ page }) => {
  await page.goto("/")
  const rodape = page.getByRole("contentinfo")
  await expect(rodape.locator("a")).toHaveCount(1)
  await expect(rodape).toContainText("Criado por Guiler")
  await expect(rodape).toContainText("© Todos os direitos reservados.")
  const autor = rodape.getByRole("link", { name: "Guiler", exact: true })
  await expect(autor).toBeVisible()
  await expect(autor).toHaveAttribute("href", "https://guiler.vercel.app/")
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
  const relatorio = page.getByRole("region", { name: "De onde vêm os cliques?" })
  await expect(relatorio.getByText(/A origem acompanha o link da divulgação/)).toHaveCount(0)
  const abertura = page.locator("#inicio")
  await expect(abertura.locator("[data-animada]")).toHaveAttribute("data-animada", "true")
  await page.clock.runFor(3300)
  await expect(abertura.getByRole("meter", { name: "Grupo 2", exact: true })).toHaveAttribute("aria-valuenow", /^(18|19|20)$/)
  const distribuicao = page.getByRole("region", { name: "Como os grupos enchem?" })
  const sequencia = distribuicao.getByRole("article").filter({ has: page.getByRole("heading", { name: "Em sequência" }) })
  const grupoA = sequencia.getByRole("meter", { name: "Grupo A", exact: true })
  await distribuicao.scrollIntoViewIfNeeded()
  await page.clock.runFor(2400)
  await expect(grupoA).toHaveAttribute("aria-valuenow", /^[45]$/)
  const ranking = relatorio.getByRole("table", { name: "Cliques por canal", exact: true })
  await ranking.scrollIntoViewIfNeeded()
  await expect(ranking.getByRole("rowheader", { name: "QR do encontro", exact: true })).toBeInViewport()

  await expect(page.getByText("Conversa de exemplo · Ana", { exact: true })).toHaveCount(0)
  const operacao = page.getByRole("region", { name: "Saiba quem chamar e onde divulgar", exact: true })
  await expect(operacao.getByRole("heading", { name: "Saiba quem chamar e onde divulgar", level: 2 })).toBeVisible()
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
  const inicial = page.getByRole("button", { name: chamadaDemonstracao, exact: true }).first()
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
    await expect(dialogo.getByRole("heading", { name: "Fila da demonstração", exact: true })).toBeVisible()
  } finally {
    liberarResposta()
  }
})
