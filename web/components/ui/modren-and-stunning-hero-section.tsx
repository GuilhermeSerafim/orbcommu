"use client"

import { useRef, type CSSProperties, type ReactNode } from "react"
import { BotaoDemonstracao } from "@/app/organizadores/inscricao"
import { Painel } from "@/app/organizadores/painel"
import { SimboloOrbCommu } from "@/components/marca-orbcommu"
import { useMovimento } from "@/app/organizadores/use-movimento"
import estilos from "@/app/organizadores/landing.module.css"

const planos = [
  { altura: 59, base: 34, segundos: 35 },
  { altura: 67, base: 19, segundos: 26 },
  { altura: 78, base: 1, segundos: 19 },
] as const

// Espalha cada plano pela cena já no primeiro quadro, inclusive com movimento reduzido.
const personagens = Array.from({ length: 42 }, (_, indice) => {
  const camada = indice % planos.length
  const ordem = Math.floor(indice / planos.length)
  const plano = planos[camada]
  const fase = (0.12 + ordem * 0.618034 + camada * 0.29) % 1
  const duracao = plano.segundos + (ordem * 3 + camada) % 8
  const invertido = (ordem + camada) % 2 === 1

  return {
    src: `/organizadores/personagens/p${(indice * 7 + ordem) % 15}.svg`,
    estilo: {
      "--altura": `${plano.altura + ordem % 7}%`,
      "--base": `${plano.base + ordem % 3}%`,
      "--duracao": `${duracao}s`,
      "--atraso": `${-duracao * (invertido ? 1 - fase : fase)}s`,
      "--sentido": invertido ? "reverse" : "normal",
      "--face": invertido ? -1 : 1,
      zIndex: camada,
      filter: camada === 0 ? "blur(1.3px)" : undefined,
    } as CSSProperties,
  }
})

export function Abertura({ chamada, navegacao }: { chamada: ReactNode; navegacao: ReactNode }) {
  const abertura = useRef<HTMLDivElement>(null)
  const automatico = useMovimento(abertura)

  return (
    <div className={estilos.abertura} id="inicio" ref={abertura}>
      <header className={`${estilos.largura} ${estilos.cabecalho}`}>
        <a href="#inicio" className="marca"><SimboloOrbCommu />OrbCommu</a>
        {navegacao}
        <div className={estilos.acoesCabecalho}>
          <BotaoDemonstracao />
        </div>
      </header>
      <section className={`${estilos.largura} ${estilos.hero}`} aria-labelledby="organizadores-titulo">
        <div>
          <h1 id="organizadores-titulo">Organize inscrições e filas de espera para turmas e eventos<span>.</span></h1>
          <p className={estilos.textoHero}>Receba os pedidos em ordem de chegada e convide pelo WhatsApp quando surgir uma vaga.</p>
          <div className={estilos.acoesHero}>
            {chamada}
            <a href="#planos">Comparar planos</a>
          </div>
          <p className={estilos.nota}>Deixe seu contato para entrar na fila da demonstração.</p>
        </div>
        <Painel automatico={automatico} />
      </section>
      <div className={estilos.multidao} data-animada={automatico} aria-hidden="true">
        {personagens.map(({ src, estilo }, indice) => (
          <img key={indice} src={src} style={estilo} alt="" aria-hidden="true"
            width={240} height={324} draggable={false} decoding="async" />
        ))}
      </div>
    </div>
  )
}
