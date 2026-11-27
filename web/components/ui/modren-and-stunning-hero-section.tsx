"use client"

import { useRef, type CSSProperties, type ReactNode } from "react"
import { BotaoDemonstracao } from "@/app/organizadores/inscricao"
import { Painel } from "@/app/organizadores/painel"
import { useMovimento } from "@/app/organizadores/use-movimento"
import estilos from "@/app/organizadores/landing.module.css"

const alturas = [0, -8, -17, 0, -14]

export function Abertura({ chamada, navegacao }: { chamada: ReactNode; navegacao: ReactNode }) {
  const abertura = useRef<HTMLDivElement>(null)
  const movimento = useMovimento(abertura)

  return (
    <div className={estilos.abertura} id="inicio" ref={abertura}>
      <header className={`${estilos.largura} ${estilos.cabecalho}`}>
        <a href="#inicio" className={estilos.marca}><span aria-hidden="true" />OrbCommu</a>
        {navegacao}
        <div className={estilos.acoesCabecalho}>
          <BotaoDemonstracao />
        </div>
      </header>
      <section className={`${estilos.largura} ${estilos.hero}`} aria-labelledby="organizadores-titulo">
        <div>
          <h1 id="organizadores-titulo">Uma fila para organizar a entrada na sua comunidade<span>.</span></h1>
          <p className={estilos.textoHero}>Receba os pedidos em ordem de chegada e convide pelo WhatsApp quando surgir uma vaga.</p>
          <div className={estilos.acoesHero}>
            {chamada}
            <a href="#planos">Comparar planos</a>
          </div>
          <p className={estilos.nota}>Deixe seu contato para entrar na fila da demonstração.</p>
        </div>
        <Painel {...movimento} />
      </section>
      <div className={estilos.multidao} data-animada={movimento.automatico} aria-hidden="true">
        {Array.from({ length: 23 }, (_, indice) => (
          <img
            key={indice}
            src={`/organizadores/personagens/p${(indice * 7) % 15}.svg`}
            alt=""
            draggable={false}
            decoding="async"
            style={{
              "--posicao": `${-3 + indice * 4.8}%`,
              "--altura": `${alturas[indice % alturas.length]}%`,
              "--largura": indice % 3 === 0 ? 9 : 7,
              "--atraso": `${indice * -1.74}s`,
            } as CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}
