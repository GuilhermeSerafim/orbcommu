"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { edicoes, origens } from "@/lib/edicoes-exemplo"
import estilos from "./relatorios.module.css"

const GraficoEdicao = dynamic(() => import("./grafico-edicao"), { ssr: false })
const percentual = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 })

export function Relatorios() {
  const areaGraficos = useRef<HTMLDivElement>(null)
  const [mostrarGraficos, definirMostrarGraficos] = useState(false)

  useEffect(() => {
    const area = areaGraficos.current
    if (!area) return
    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) {
        definirMostrarGraficos(true)
        observador.disconnect()
      }
    }, { rootMargin: "400px" })
    observador.observe(area)
    return () => observador.disconnect()
  }, [])

  const { primeiroDia, dias, origens: cliquesPorOrigem, pedidos, entradas } = edicoes.nov
  const aberturas = dias.reduce((total, cliques) => total + cliques, 0)
  const conversao = percentual.format(entradas / pedidos)
  const porOrigem = origens.map((nome, i) => ({ nome, valor: cliquesPorOrigem[i] }))
    .sort((a, b) => b.valor - a.valor)
  const porDia = dias.map((valor, i) => ({ nome: `${primeiroDia + i} nov`, valor }))
  const destaque = porOrigem[0]
  const pico = porDia.reduce((maior, dia) => dia.valor > maior.valor ? dia : maior)

  return (
    <section id="relatorios" aria-labelledby="relatorios-titulo" className={estilos.secao}>
      <div className={estilos.conteudo}>
        <header className={estilos.cabecalho}>
          <h2 id="relatorios-titulo">De onde vêm os cliques?</h2>
          <p>Compare os canais de divulgação e veja em quais dias o link do evento recebeu mais acessos.</p>
        </header>

        <div className={estilos.graficos} ref={areaGraficos}>
          <figure aria-labelledby="relatorios-origens">
            <figcaption>
              <h3 id="relatorios-origens">Aberturas por origem</h3>
              <p><strong>{destaque.nome}</strong> respondeu por <strong>{percentual.format(destaque.valor / aberturas)}</strong> das aberturas.</p>
            </figcaption>
            <div className={estilos.plotagem}>{mostrarGraficos && <GraficoEdicao tipo="origens" itens={porOrigem} />}</div>
          </figure>
          <figure aria-labelledby="relatorios-dias">
            <figcaption>
              <h3 id="relatorios-dias">Aberturas por dia</h3>
              <p>O pico foi em <strong>{pico.nome}</strong>, com <strong>{pico.valor} aberturas</strong>.</p>
            </figcaption>
            <div className={estilos.plotagem}>{mostrarGraficos && <GraficoEdicao tipo="dias" itens={porDia} />}</div>
          </figure>
        </div>

        <div className={estilos.resumo}>
          <h3>Da abertura à entrada</h3>
          <dl className={estilos.metricas}>
            {[
              { nome: "Aberturas do link", valor: aberturas },
              { nome: "Pedidos de entrada", valor: pedidos },
              { nome: "Entradas confirmadas", valor: entradas },
            ].map(({ nome, valor }) => (
              <div key={nome}>
                <dt>{nome}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
          <p className={estilos.conversao}>{entradas} de {pedidos} pedidos resultaram em entrada ({conversao})</p>
        </div>

        <details className={estilos.dados}>
          <summary>Ver dados dos gráficos</summary>
          <div className={estilos.tabelas}>
            {[
              { titulo: "Aberturas por origem", coluna: "Origem", linhas: porOrigem },
              { titulo: "Aberturas por dia", coluna: "Dia", linhas: porDia },
            ].map(({ titulo, coluna, linhas }) => (
              <table key={titulo}>
                <caption>{titulo}</caption>
                <thead><tr><th scope="col">{coluna}</th><th scope="col">Aberturas</th></tr></thead>
                <tbody>{linhas.map(({ nome, valor }) => (
                  <tr key={nome}><th scope="row">{nome}</th><td>{valor}</td></tr>
                ))}</tbody>
              </table>
            ))}
          </div>
        </details>
      </div>
    </section>
  )
}
