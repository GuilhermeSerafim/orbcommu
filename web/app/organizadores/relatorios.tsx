"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { AtSign, ChevronDown, Link2, Link2Off, QrCode } from "lucide-react"
import { edicoes, origens } from "@/lib/edicoes-exemplo"
import estilos from "./relatorios.module.css"

const GraficoEdicao = dynamic(() => import("./grafico-edicao"), {
  ssr: false,
  loading: () => <p className={estilos.carregando}>Carregando gráfico…</p>,
})

const icones = [QrCode, Link2, AtSign, Link2Off]
const { primeiroDia, dias, origens: cliquesPorOrigem, pedidos, entradas } = edicoes.nov
const canais = origens.map((nome, i) => ({ nome, cliques: cliquesPorOrigem[i], Icone: icones[i] }))
  .sort((a, b) => b.cliques - a.cliques)
const total = canais.reduce((soma, canal) => soma + canal.cliques, 0)
const lider = canais[0]
const porDia = dias.map((valor, i) => ({ nome: `${primeiroDia + i} nov`, valor }))
const pico = porDia.reduce((maior, dia) => dia.valor > maior.valor ? dia : maior)
const percentual = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 })

export function Relatorios() {
  const [diaAberto, definirDiaAberto] = useState(false)

  return (
    <section id="relatorios" aria-labelledby="relatorios-titulo" className={estilos.secao}>
      <div className={estilos.conteudo}>
        <header className={estilos.cabecalho}>
          <h2 id="relatorios-titulo">De onde vêm os cliques?</h2>
          <p>O canal <strong>{lider.nome}</strong> liderou na demonstração, com <strong>{lider.cliques} dos {total} cliques</strong> ({percentual.format(lider.cliques / total)}).</p>
        </header>

        <div className={estilos.painel}>
          <table className={estilos.canais}>
            <caption className="sr-only">Cliques por canal</caption>
            <thead>
              <tr><th scope="col">Canal de divulgação</th><th scope="col">Cliques</th></tr>
            </thead>
            <tbody>
              {canais.map(({ nome, cliques, Icone }) => (
                <tr key={nome}>
                  <th scope="row">
                    <div className={estilos.canal}>
                      <span className={estilos.icone} aria-hidden="true"><Icone size={20} /></span>
                      <span className={estilos.canalNome}>
                        {nome}
                        <span className={estilos.barra} aria-hidden="true" style={{ width: `${100 * cliques / lider.cliques}%` }} />
                      </span>
                    </div>
                  </th>
                  <td>{cliques}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <details className={estilos.detalhe} onToggle={evento => definirDiaAberto(evento.currentTarget.open)}>
            <summary>Cliques por dia<ChevronDown aria-hidden="true" size={18} /></summary>
            <figure aria-label="Cliques por dia" className={estilos.diario}>
              <figcaption>O dia com mais cliques foi <strong>{pico.nome}</strong>, com <strong>{pico.valor} cliques</strong>.</figcaption>
              {diaAberto && <div className={estilos.plotagem}><GraficoEdicao itens={porDia} /></div>}
              <details className={estilos.valores}>
                <summary>Ver valores por dia</summary>
                <table>
                  <caption className="sr-only">Cliques por dia</caption>
                  <thead><tr><th scope="col">Dia</th><th scope="col">Cliques</th></tr></thead>
                  <tbody>{porDia.map(({ nome, valor }) => (
                    <tr key={nome}><th scope="row">{nome}</th><td>{valor}</td></tr>
                  ))}</tbody>
                </table>
              </details>
            </figure>
          </details>
          <details className={estilos.detalhe}>
            <summary>Pedidos e entradas<ChevronDown aria-hidden="true" size={18} /></summary>
            <div className={estilos.resumo}>
              <dl>
                {[
                  { nome: "Cliques no link", valor: total },
                  { nome: "Pedidos de entrada", valor: pedidos },
                  { nome: "Entradas confirmadas", valor: entradas },
                ].map(({ nome, valor }) => (
                  <div key={nome}><dt>{nome}</dt><dd>{valor}</dd></div>
                ))}
              </dl>
              <p>{entradas} de {pedidos} pedidos resultaram em entrada ({percentual.format(entradas / pedidos)}).</p>
            </div>
          </details>
        </div>
      </div>
    </section>
  )
}
