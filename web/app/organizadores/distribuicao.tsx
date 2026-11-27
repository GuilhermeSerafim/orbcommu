"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { destino } from "@/lib/simular-distribuicao"
import estilos from "./landing.module.css"
import { useMovimento } from "./use-movimento"

const modos = [
  { id: "ordem", titulo: "Em sequência", descricao: "Um grupo enche antes de o próximo receber pessoas." },
  { id: "equilibrio", titulo: "Por ocupação", descricao: "O grupo com mais espaço livre recebe a próxima pessoa." },
  { id: "sorteio", titulo: "Por sorteio", descricao: "Qualquer grupo com vaga pode ser o próximo." },
] as const

const capacidade = 5
const nomes = ["Grupo A", "Grupo B", "Grupo C", "Grupo D"]
const estados = ["Livre", "Médio", "Lotado"] as const

function estadoOcupacao(ocupadas: number): typeof estados[number] {
  if (ocupadas >= capacidade) return "Lotado"
  if (ocupadas >= capacidade * 0.8) return "Médio"
  return "Livre"
}

const statusInicial = "Simulação · 4 vagas já ocupadas"
const statusFinal = "Grupos lotados · 1 pessoa aguardando"
const statusChegadas = (chegadas: number) => `Chegadas simuladas · ${chegadas}`

const inicial = {
  anuncio: "",
  chegadas: 0,
  aguardando: false,
  linhas: modos.map(modo => ({
    ...modo,
    grupos: [3, 1, 0, 0].map(membros => ({ membros, reservas: 0, capacidade })),
    ultimo: null as number | null,
  })),
}

function avancar(atual: typeof inicial, sorteio: number, manual: boolean): typeof inicial {
  if (atual.aguardando) return atual

  const linhas = atual.linhas.map(linha => {
    const ultimo = destino(linha.id, linha.grupos, () => sorteio)
    const grupos = linha.grupos.map((grupo, indice) =>
      indice === ultimo ? { ...grupo, membros: grupo.membros + 1 } : grupo,
    )
    return { ...linha, grupos, ultimo }
  })

  const chegadas = atual.chegadas + 1
  const aguardando = linhas[0].ultimo === null
  const anuncio = aguardando ? statusFinal : manual ? statusChegadas(chegadas) : atual.anuncio
  return { chegadas, aguardando, linhas, anuncio }
}

export function Distribuicao() {
  const ref = useRef<HTMLElement>(null)
  const { automatico, alternarPausa, pausado, reduzido } = useMovimento(ref)
  const [{ chegadas, aguardando, linhas, anuncio }, atualizar] = useState(inicial)

  const avancarUmaPessoa = useCallback((manual: boolean) => {
    const sorteio = Math.random()
    atualizar(atual => avancar(atual, sorteio, manual))
  }, [])

  useEffect(() => {
    if (!automatico || aguardando) return
    const intervalo = window.setInterval(() => avancarUmaPessoa(false), 1200)
    return () => window.clearInterval(intervalo)
  }, [automatico, aguardando, avancarUmaPessoa])

  const status = aguardando ? statusFinal : chegadas ? statusChegadas(chegadas) : statusInicial

  return (
    <section className={estilos.distribuicao} id="distribuicao" aria-labelledby="titulo-distribuicao" ref={ref}>
      <div className={estilos.distribuicaoConteudo}>
        <header className={estilos.distribuicaoIntroducao}>
          <h2 id="titulo-distribuicao">Como os grupos enchem?</h2>
          <p>Compare três formas de distribuir as mesmas chegadas. Cada barra mostra quantas das cinco vagas de um grupo estão ocupadas.</p>
        </header>
        <div className={estilos.distribuicaoSimulacao}>
          <div className={estilos.distribuicaoQuadro}>
            {linhas.map(({ id, titulo, descricao, grupos, ultimo }) => (
              <article key={id} className={estilos.distribuicaoModo}>
                <div className={estilos.distribuicaoGrupos}>
                  {grupos.map(({ membros, reservas }, indice) => {
                    const ocupadas = membros + reservas
                    const estado = estadoOcupacao(ocupadas)
                    const recebeu = ultimo === indice
                    const leitura = `${estado} · ${ocupadas} de ${capacidade} vagas ocupadas`
                    return (
                      <div key={nomes[indice]} className={estilos.distribuicaoGrupo} data-estado={estado}
                        data-recebeu={recebeu} title={`${nomes[indice]} · ${leitura}`}>
                        <div className={estilos.distribuicaoMedidor} role="meter" aria-label={nomes[indice]}
                          aria-valuemin={0} aria-valuemax={capacidade} aria-valuenow={ocupadas}
                          aria-valuetext={`${leitura}${recebeu ? ", recebeu a última chegada" : ""}`}>
                          <i style={{ transform: `scaleY(${ocupadas / capacidade})` }} />
                        </div>
                        <span aria-hidden="true">{ocupadas}/{capacidade}</span>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <h3>{titulo}</h3>
                  <p>{descricao}</p>
                </div>
              </article>
            ))}
            <ul className={estilos.distribuicaoLegenda} aria-label="Legenda de ocupação">
              {estados.map(estado => <li key={estado} data-estado={estado}>{estado}</li>)}
            </ul>
          </div>
          <div className={estilos.distribuicaoStatus}>
            <b>{status}</b>
            <span className="sr-only" role="status">{anuncio}</span>
            <div className={estilos.distribuicaoAcoes}>
              {!reduzido && (
                <button type="button" aria-disabled={aguardando} onClick={() => {
                  if (aguardando) return
                  alternarPausa()
                  atualizar(atual => ({ ...atual, anuncio: pausado ? "Simulação retomada" : "Simulação pausada" }))
                }}>
                  {pausado || aguardando ? "Continuar" : "Pausar"}
                </button>
              )}
              <button type="button" aria-disabled={aguardando} onClick={() => {
                if (aguardando) return
                if (!pausado && !reduzido) alternarPausa()
                avancarUmaPessoa(true)
              }}>Avançar uma pessoa</button>
              <button type="button" onClick={() => {
                atualizar({ ...inicial, anuncio: "Simulação reiniciada" })
                if (pausado) alternarPausa()
              }}>Recomeçar</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
