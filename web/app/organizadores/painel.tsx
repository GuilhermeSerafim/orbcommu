"use client"

import { useEffect, useState } from "react"
import estilos from "./landing.module.css"

const capacidade = 20
const numero = new Intl.NumberFormat("pt-BR", { useGrouping: "always" })

type Simulacao = {
  cliques: number
  grupos: number[]
  ultimoGrupo: number | null
  proximoEvento: number
  evento: string
}

const inicial: Simulacao = {
  cliques: 1284,
  grupos: [20, 17, 0],
  ultimoGrupo: null,
  proximoEvento: 0,
  evento: "",
}

function avancar(atual: Simulacao): Simulacao {
  const grupo = atual.grupos.findIndex(ocupadas => ocupadas < capacidade)
  if (grupo < 0) return atual

  switch (atual.proximoEvento) {
    case 0:
      return { ...atual, proximoEvento: 1, cliques: atual.cliques + 1, evento: "Novo clique no link" }
    case 1:
      return { ...atual, proximoEvento: 2, evento: "Novo pedido de entrada" }
    default:
      return {
        ...atual,
        proximoEvento: 0,
        grupos: atual.grupos.map((ocupadas, indice) => ocupadas + Number(indice === grupo)),
        ultimoGrupo: grupo,
        evento: `Entrada confirmada no Grupo ${grupo + 1}`,
      }
  }
}

export function Painel({ automatico }: { automatico: boolean }) {
  const [simulacao, atualizar] = useState(inicial)
  const semVaga = simulacao.grupos.every(ocupadas => ocupadas >= capacidade)

  useEffect(() => {
    if (!automatico || semVaga) return
    const intervalo = window.setInterval(() => atualizar(avancar), 1100)
    return () => window.clearInterval(intervalo)
  }, [automatico, semVaga])

  return (
    <div className={estilos.painel}>
      <strong>Simulação de vagas</strong>
      <p className={estilos.metricaPainel}><strong>{numero.format(simulacao.cliques)}</strong><span>cliques no link</span></p>
      {simulacao.grupos.map((ocupadas, indice) => (
        <div key={indice} className={estilos.linhaPainel} data-recebeu={simulacao.ultimoGrupo === indice}>
          <div className={estilos.nivelPainel}>
            <b>Grupo {indice + 1}</b>
            <div className={estilos.trilhoPainel} role="meter" aria-label={`Grupo ${indice + 1}`}
              aria-valuemin={0} aria-valuemax={capacidade} aria-valuenow={ocupadas}
              aria-valuetext={`${ocupadas} de ${capacidade} vagas ocupadas${ocupadas === capacidade ? ", lotado" : ""}`}>
              <span style={{ width: `${100 * ocupadas / capacidade}%` }} />
            </div>
          </div>
          <small aria-hidden="true">
            {ocupadas} / {capacidade}
            {ocupadas === capacidade && <span className={estilos.grupoLotado}>Lotado</span>}
          </small>
        </div>
      ))}
      <p className={estilos.eventoPainel}>{semVaga ? "Grupos lotados. Os pedidos aguardam vaga." : simulacao.evento}</p>
    </div>
  )
}
