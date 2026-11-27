"use client"

import { useEffect, useState } from "react"
import estilos from "./landing.module.css"

const capacidade = 20
const numero = new Intl.NumberFormat("pt-BR", { useGrouping: "always" })
const etapasAna = [
  ["Para analisar", "Aprovar Ana"],
  ["Aguardando vaga", "Chamar Ana"],
  ["Envio a confirmar", "Confirmar envio"],
  ["Convite enviado", "Confirmar entrada"],
  ["Entrada confirmada", null],
] as const

type Simulacao = {
  cliques: number
  grupos: number[]
  ultimoGrupo: number | null
  etapaAna: number
  proximoEvento: number
  evento: string
}

const inicial: Simulacao = {
  cliques: 1284,
  grupos: [20, 17, 0],
  ultimoGrupo: null,
  etapaAna: 0,
  proximoEvento: 0,
  evento: "",
}

function confirmarEntrada(atual: Simulacao) {
  const indice = atual.grupos.findIndex(ocupadas => ocupadas < capacidade)
  if (indice < 0) return { ...atual, evento: "Grupos lotados · pedido aguardando vaga" }

  return {
    ...atual,
    grupos: atual.grupos.map((ocupadas, grupo) => ocupadas + Number(grupo === indice)),
    ultimoGrupo: indice,
    evento: `Entrada confirmada no Grupo ${indice + 1}`,
  }
}

function avancar(atual: Simulacao): Simulacao {
  const proximo = { ...atual, proximoEvento: (atual.proximoEvento + 1) % 3 }
  switch (atual.proximoEvento) {
    case 0: return { ...proximo, cliques: atual.cliques + 1, evento: "Novo clique no link" }
    case 1: return { ...proximo, evento: "Novo pedido de entrada" }
    default: return confirmarEntrada(proximo)
  }
}

function avancarAna(atual: Simulacao): Simulacao {
  if (atual.etapaAna >= etapasAna.length - 1) return atual
  const seguinte = { ...atual, etapaAna: atual.etapaAna + 1 }
  if (seguinte.etapaAna < etapasAna.length - 1) return seguinte
  if (atual.grupos.every(ocupadas => ocupadas >= capacidade)) return atual
  return confirmarEntrada(seguinte)
}

export function Painel({ automatico, alternarPausa, pausado, reduzido }: {
  automatico: boolean
  alternarPausa: () => void
  pausado?: boolean
  reduzido?: boolean
}) {
  const [simulacao, atualizar] = useState(inicial)
  const [mostrarFila, escolherFila] = useState(false)
  const [estadoAna, acaoAna] = etapasAna[simulacao.etapaAna]
  const podeAgir = simulacao.etapaAna !== 3 || simulacao.grupos.some(ocupadas => ocupadas < capacidade)

  useEffect(() => {
    if (!automatico) return
    const intervalo = window.setInterval(() => atualizar(avancar), 1100)
    return () => window.clearInterval(intervalo)
  }, [automatico])

  return (
    <div className={estilos.painel}>
      <div className={estilos.cabecalhoPainel}><strong>Fila da comunidade</strong><small>Exemplo</small></div>
      <div className={estilos.abasPainel} role="group" aria-label="Visualização da fila">
        <button type="button" aria-pressed={!mostrarFila} onClick={() => escolherFila(false)}>Grupos</button>
        <button type="button" aria-pressed={mostrarFila} onClick={() => escolherFila(true)}>Fila</button>
      </div>
      {mostrarFila ? (
        <div>
          <div className={estilos.linhaPainel}><b>Ana</b><span role="status">{estadoAna}</span></div>
          <div className={estilos.linhaPainel}><b>Ravi</b><span>Aguardando vaga</span></div>
          <div className={estilos.linhaPainel}><b>Lia</b><span>Convite enviado</span></div>
          <button type="button" className={estilos.controlePainel} aria-disabled={!acaoAna || !podeAgir}
            onClick={() => atualizar(avancarAna)}>{acaoAna ?? "Concluído"}</button>
        </div>
      ) : (
        <div>
          <p className={estilos.metricaPainel}><strong>{numero.format(simulacao.cliques)}</strong><span>cliques hoje</span></p>
          {simulacao.grupos.map((ocupadas, indice) => (
            <div key={indice} className={estilos.linhaPainel} data-recebeu={simulacao.ultimoGrupo === indice}>
              <div className={estilos.nivelPainel}>
                <b>Grupo {indice + 1}</b>
                <div className={estilos.trilhoPainel} role="meter" aria-label={`Grupo ${indice + 1}`}
                  aria-valuemin={0} aria-valuemax={capacidade} aria-valuenow={ocupadas}>
                  <span style={{ width: `${100 * ocupadas / capacidade}%` }} />
                </div>
              </div>
              <small aria-hidden="true">{ocupadas} / {capacidade}</small>
            </div>
          ))}
        </div>
      )}
      <div className={estilos.acoesPainel}>
        {!reduzido && (
          <button type="button" className={estilos.controlePainel} onClick={alternarPausa}>
            {pausado ? "Retomar animação" : "Pausar animação"}
          </button>
        )}
        <button type="button" className={estilos.controlePainel} onClick={() => atualizar(avancar)}>Avançar</button>
      </div>
      <p className={estilos.eventoPainel}>{simulacao.evento}</p>
    </div>
  )
}
