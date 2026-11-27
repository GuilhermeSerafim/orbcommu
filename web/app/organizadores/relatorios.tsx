"use client"

import { useState } from "react"
import { edicoes, origens } from "@/lib/edicoes-exemplo"
import estilos from "./relatorios.module.css"

export function Relatorios() {
  const [edicao, selecionarEdicao] = useState<keyof typeof edicoes>("nov")
  const { periodo, primeiroDia, dias, origens: cliquesPorOrigem, pedidos, entradas } = edicoes[edicao]
  const aberturas = dias.reduce((total, cliques) => total + cliques, 0)
  const conversao = Math.round(100 * entradas / pedidos)
  const maiorDia = Math.max(...dias)
  const maiorOrigem = Math.max(...cliquesPorOrigem)

  return (
    <section id="relatorios" aria-labelledby="relatorios-titulo" className={estilos.secao}>
      <div className={estilos.conteudo}>
        <div className={estilos.cabecalho}>
          <div>
            <h2 id="relatorios-titulo">De onde vêm os cliques?</h2>
            <p>Veja quais divulgações trouxeram gente para a fila e quantos pedidos terminaram em entrada na comunidade.</p>
          </div>
          <label>
            Edição de exemplo
            <select value={edicao} onChange={evento => selecionarEdicao(evento.target.value as keyof typeof edicoes)}>
              {Object.entries(edicoes).map(([id, { nome }]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </label>
        </div>
        <div className={estilos.painel}>
          <p className={estilos.periodo}>Resumo da edição · {periodo}</p>
          <dl className={estilos.metricas}>
            {[
              { nome: "Aberturas", valor: aberturas },
              { nome: "Pedidos", valor: pedidos },
              { nome: "Entradas confirmadas", valor: entradas },
            ].map(({ nome, valor }) => (
              <div key={nome}>
                <dt>{nome}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
          <div className={estilos.graficos}>
            <div role="group" aria-labelledby="relatorios-dias">
              <h3 id="relatorios-dias">Aberturas por dia</h3>
              <div className={estilos.barras}>
                {dias.map((cliques, indice) => {
                  const dia = primeiroDia + indice
                  return (
                    <div key={dia} className={estilos.barra} role="img" aria-label={`Dia ${dia}, ${cliques} aberturas`}>
                      <span>{cliques}</span>
                      <i aria-hidden="true" style={{ height: Math.round(90 * cliques / maiorDia) }} />
                      <small>{dia}</small>
                    </div>
                  )
                })}
              </div>
            </div>
            <div role="group" aria-labelledby="relatorios-origens">
              <h3 id="relatorios-origens">Origem das aberturas</h3>
              <ul className={estilos.origens} role="list">
                {cliquesPorOrigem.map((cliques, indice) => (
                  <li key={origens[indice]} className={estilos.origem}>
                    <span>{origens[indice]}</span>
                    <b>{cliques}</b>
                    <div className={estilos.trilha} aria-hidden="true">
                      <i style={{ width: `${Math.round(100 * cliques / maiorOrigem)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className={estilos.conversao}>
            <p>{entradas} de {pedidos} pedidos resultaram em entrada ({conversao}%)</p>
            <div className={estilos.trilha} aria-hidden="true">
              <i style={{ width: `${conversao}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
