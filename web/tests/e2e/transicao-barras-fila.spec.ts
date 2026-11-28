import { expect, type Locator } from "@playwright/test"
import { test } from "../support/playwright"
import { criarOperadores, fazerLogin } from "../support/operadores"

// Mede a barra pintada em cada quadro, sem incluir o rótulo no SVG.
function observar(painel: Locator, aba: "etapas" | "origens") {
  return painel.evaluateHandle((elemento, aba) => {
    const amostras: number[] = []
    let frame = 0
    function medir() {
      if (aba === "etapas") {
        const barra = elemento.querySelector('[data-etapa="Entradas confirmadas"] rect')
        if (barra) amostras.push(barra.getBoundingClientRect().width)
      } else {
        const nome = Array.from(elemento.querySelectorAll("span")).find(no => no.textContent === "QR do encontro")
        const barra = nome?.parentElement?.querySelector("i")
        const trilho = barra?.parentElement?.getBoundingClientRect().width
        if (trilho && barra) amostras.push(barra.getBoundingClientRect().width / trilho)
      }
      frame = requestAnimationFrame(medir)
    }
    medir()
    return { amostras, parar: () => cancelAnimationFrame(frame) }
  }, aba)
}

for (const preferencia of ["no-preference", "reduce"] as const) {
  test(`barras da fila acompanham a mudança do período e do ranking com movimento ${preferencia}`, async ({ page }) => {
    const contas = await criarOperadores()
    try {
      await page.emulateMedia({ reducedMotion: preferencia })
      await page.route("**/api/fila/resumo?*", async rota => {
        const mes = new URL(rota.request().url()).searchParams.get("dias") === "30"
        await rota.fulfill({ json: {
          dias: mes ? 30 : 7, atualizarEmMs: null,
          escala: { pedidos: 50, entradasPorOrigem: 16 },
          atuais: { paraAnalisar: 2, aguardandoVaga: 1, chamadaIniciada: 1, aConferir: 1, esperaMaisAntigaMs: 60000 },
          funil: mes ? { recebidos: 50, aprovados: 42, convitesEnviados: 32, entradasConfirmadas: 24 }
            : { recebidos: 20, aprovados: 12, convitesEnviados: 8, entradasConfirmadas: 4 },
          divulgacoes: mes ? [
            { nome: "QR do encontro", pedidos: 30, entradasConfirmadas: 16 },
            { nome: "Bio do evento", pedidos: 20, entradasConfirmadas: 8 },
          ] : [
            { nome: "Bio do evento", pedidos: 12, entradasConfirmadas: 3 },
            { nome: "QR do encontro", pedidos: 8, entradasConfirmadas: 1 },
          ],
        } })
      })
      await fazerLogin(page, contas.leitora)
      const grafico = page.getByRole("region", { name: "Resultados dos pedidos" })
      const painel = grafico.getByRole("tabpanel")
      await expect(painel.locator("dd")).toHaveText(["20", "12", "8", "4"])
      await expect(painel.locator("svg text").filter({ hasText: /^20$/ })).toBeVisible()

      for (const aba of ["etapas", "origens"] as const) {
        if (aba === "origens") {
          await grafico.getByRole("tab", { name: "Por divulgação" }).press("Enter")
          await expect(painel.getByText(/^(Bio do evento|QR do encontro)$/)).toHaveText(["QR do encontro", "Bio do evento"])
          await expect(painel).toHaveCSS("opacity", "1")
        }
        const amostragem = await observar(painel, aba)
        await grafico.getByRole("button", { name: aba === "etapas" ? "30 dias" : "7 dias" }).press("Enter")
        const leitura = page.getByRole("region", { name: "Quantos pedidos viraram entrada?" })
        await expect(leitura).toContainText(aba === "etapas" ? "24 de 50" : "4 de 20")
        const inicio = aba === "etapas" ? 4 / 50 : 1
        const fim = aba === "etapas" ? 24 / 50 : 1 / 16
        const medirMaximo = () => aba === "etapas"
          ? painel.locator('[data-etapa="Recebidos"] rect').evaluate(barra => barra.getBoundingClientRect().width) : 1
        await expect.poll(async () => {
          const ultima = await amostragem.evaluate(({ amostras }) => amostras.at(-1) ?? 0)
          return ultima / await medirMaximo()
        }).toBeCloseTo(fim, 4)
        const amostras = await amostragem.evaluate(({ amostras, parar }) => { parar(); return amostras })
        const larguraMaxima = await medirMaximo()
        const valores = amostras.map(valor => valor / larguraMaxima)
        expect.soft(valores[0], aba).toBeCloseTo(inicio, 2)
        expect.soft(valores.at(-1), aba).toBeCloseTo(fim, 2)
        if (aba === "origens") {
          await expect(painel.getByText(/^(Bio do evento|QR do encontro)$/)).toHaveText(["Bio do evento", "QR do encontro"])
        }
        // O QR troca o primeiro pelo segundo lugar. Deve partir de sua própria largura anterior.
        const variacao = valores[valores.length - 1] - valores[0]
        const progresso = valores.map(valor => (valor - valores[0]) / variacao)
        if (preferencia === "reduce") expect.soft(progresso.some(p => Math.abs(p) > .02 && Math.abs(1 - p) > .02), aba).toBe(false)
        else expect.soft(progresso.some(p => p > .02 && p < .98),
          `${aba}: larguras observadas ${[...new Set(valores.map(valor => valor.toFixed(2)))].join(", ")}`).toBe(true)
      }
    } finally {
      await contas.limpar()
    }
  })
}
