"use client"

import { useEffect, useState } from "react"
import estilos from "./landing.module.css"

const capacidade = 20
const limiteRecentes = 3
const numero = new Intl.NumberFormat("pt-BR", { useGrouping: "always" })
const etapasAna = [
  ["Para analisar", "Aprovar Ana"],
  ["Aguardando vaga", "Chamar Ana"],
  ["Envio a confirmar", "Confirmar envio"],
  ["Convite enviado", "Confirmar entrada"],
  ["Entrada confirmada", null],
] as const

type Pedido = { id: number; grupo: number | null }

type Simulacao = {
  cliques: number
  grupos: number[]
  ultimoGrupo: number | null
  etapaAna: number
  proximoEvento: number
  evento: string
  ultimoPedido: number
  recentes: Pedido[]
}

const inicial: Simulacao = {
  cliques: 1284,
  grupos: [20, 17, 0],
  ultimoGrupo: null,
  etapaAna: 0,
  proximoEvento: 0,
  evento: "",
  ultimoPedido: 0,
  recentes: [],
}

function primeiroGrupoComVaga(atual: Simulacao) {
  return atual.grupos.findIndex(ocupadas => ocupadas < capacidade)
}

function confirmarEntrada(atual: Simulacao, grupo: number): Simulacao {
  return {
    ...atual,
    grupos: atual.grupos.map((ocupadas, indice) => ocupadas + Number(indice === grupo)),
    ultimoGrupo: grupo,
    evento: `Entrada confirmada no Grupo ${grupo + 1}`,
  }
}

function estadoPedido(grupo: number | null, lotado: boolean) {
  if (grupo !== null) return `Entrada confirmada · Grupo ${grupo + 1}`
  return lotado ? "Aguardando vaga" : "Para analisar"
}

function avancar(atual: Simulacao): Simulacao {
  const grupo = primeiroGrupoComVaga(atual)
  if (grupo < 0) return atual

  const proximo = { ...atual, proximoEvento: (atual.proximoEvento + 1) % 3 }
  switch (atual.proximoEvento) {
    case 0:
      return { ...proximo, cliques: atual.cliques + 1, evento: "Novo clique no link" }
    case 1: {
      const id = atual.ultimoPedido + 1
      return {
        ...proximo,
        evento: "Novo pedido de entrada",
        ultimoPedido: id,
        recentes: [{ id, grupo: null }, ...atual.recentes].slice(0, limiteRecentes),
      }
    }
    default:
      return confirmarEntrada({
        ...proximo,
        recentes: atual.recentes.map(pedido => pedido.id === atual.ultimoPedido ? { ...pedido, grupo } : pedido),
      }, grupo)
  }
}

function avancarAna(atual: Simulacao): Simulacao {
  if (atual.etapaAna >= etapasAna.length - 1) return atual
  const grupo = primeiroGrupoComVaga(atual)
  if (grupo < 0 && atual.etapaAna >= 1) return atual
  const seguinte = { ...atual, etapaAna: atual.etapaAna + 1 }
  return seguinte.etapaAna === etapasAna.length - 1 ? confirmarEntrada(seguinte, grupo) : seguinte
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
  const lotado = primeiroGrupoComVaga(simulacao) < 0
  const aguardaVaga = lotado && simulacao.etapaAna >= 1 && simulacao.etapaAna < etapasAna.length - 1

  useEffect(() => {
    if (!automatico || lotado) return
    const intervalo = window.setInterval(() => atualizar(avancar), 1100)
    return () => window.clearInterval(intervalo)
  }, [automatico, lotado])

  return (
    <div className={estilos.painel}>
      <div className={estilos.cabecalhoPainel}><strong>Fila da comunidade</strong><small>Exemplo</small></div>
      <div className={estilos.abasPainel} role="group" aria-label="Visualização da fila">
        <button type="button" aria-pressed={!mostrarFila} onClick={() => escolherFila(false)}>Grupos</button>
        <button type="button" aria-pressed={mostrarFila} onClick={() => escolherFila(true)}>Fila</button>
      </div>
      {mostrarFila ? (
        <div>
          <div className={estilos.linhaPainel}><b>Ana</b><span role="status">
            {estadoAna}{aguardaVaga && simulacao.etapaAna > 1 ? " · Aguardando vaga" : ""}
          </span></div>
          <button type="button" className={estilos.controlePainel} aria-disabled={!acaoAna || aguardaVaga}
            onClick={() => atualizar(avancarAna)}>{acaoAna ?? "Concluído"}</button>
          <div className={estilos.filaPainel}>
            <div className={estilos.linhaPainel}><b>Ravi</b><span>Aguardando vaga</span></div>
            <div className={estilos.linhaPainel}><b>Lia</b><span>Convite enviado</span></div>
            {simulacao.recentes.length > 0 && (
              <ul aria-label="Pedidos recentes" role="list">
                {simulacao.recentes.map(({ id, grupo }) => (
                  <li className={estilos.linhaPainel} key={id}>
                    <b>Pedido {id}</b>
                    <span>{estadoPedido(grupo, lotado)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div>
          <p className={estilos.metricaPainel}><strong>{numero.format(simulacao.cliques)}</strong><span>cliques hoje</span></p>
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
        </div>
      )}
      <div className={estilos.acoesPainel}>
        {!reduzido && (
          <button type="button" className={estilos.controlePainel} onClick={alternarPausa}>
            {pausado ? "Retomar animação" : "Pausar animação"}
          </button>
        )}
        <button type="button" className={estilos.controlePainel} aria-disabled={lotado} onClick={() => atualizar(avancar)}>
          Avançar
        </button>
        <button type="button" className={estilos.controlePainel} onClick={() => atualizar(inicial)}>Reiniciar</button>
      </div>
      <p className={estilos.eventoPainel}>{lotado ? "Grupos lotados. Os pedidos aguardam vaga." : simulacao.evento}</p>
    </div>
  )
}
