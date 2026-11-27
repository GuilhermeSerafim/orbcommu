"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import { AtSign, Link2, Link2Off, QrCode } from "lucide-react"
import { useMovimento } from "@/app/organizadores/use-movimento"
import { edicoes, entradasNovembro as entradasAcumuladas, origens as nomesOrigens } from "@/lib/edicoes-exemplo"
import { Button } from "@/components/ui/button"
import { SimboloOrbCommu } from "@/components/marca-orbcommu"
import estilos from "./ink-orbit-features.module.css"

const pessoas = [
  { x: 18, y: 62, figura: 2 }, { x: 45, y: 22, figura: 3 },
  { x: 94, y: 12, figura: 4 }, { x: 142, y: 42, figura: 8 },
  { x: 132, y: 118, figura: 10 },
]

const trajetos = [
  "M 0 53 C 19 53 18 79 40 79 S 72 65 100 65",
  "M 0 56 C 17 56 23 88 40 88 S 73 87 100 92",
]

const origens = [
  { Icone: QrCode, trajeto: "M50 50 H27 V20 H14" },
  { Icone: Link2, trajeto: "M50 50 H73 V20 H86" },
  { Icone: AtSign, trajeto: "M50 50 H27 V80 H14" },
  { Icone: Link2Off, trajeto: "M50 50 H73 V80 H86" },
].map((origem, i) => ({ ...origem, nome: nomesOrigens[i], cliques: edicoes.nov.origens[i] }))

const pontos = entradasAcumuladas.map((total, i) => ({ x: 20 + i * 50, y: 150 - total * 10 }))
const curva = pontos.reduce((d, ponto, i) => {
  if (i === 0) return `M ${ponto.x} ${ponto.y}`
  const anterior = pontos[i - 1]
  const meio = (anterior.x + ponto.x) / 2
  return `${d} C ${meio} ${anterior.y} ${meio} ${ponto.y} ${ponto.x} ${ponto.y}`
}, "")

function FluxoDaEdicao() {
  return (
    <article className={`${estilos.quadro} ${estilos.principal}`}>
      <div className={estilos.fluxo}>
        <svg className={estilos.conexoes} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {trajetos.map((d, i) => (
            <g key={d}>
              <path d={d} className={i ? estilos.tracado : undefined} />
              <path d={d} pathLength="100" className={estilos.pulso} />
            </g>
          ))}
        </svg>
        <div className={estilos.pessoas} aria-hidden="true">
          <svg viewBox="0 0 160 140" preserveAspectRatio="none">
            {pessoas.map(({ x, y }) => <line key={x} x1={x} y1={y} x2="78" y2="76" />)}
          </svg>
          {pessoas.map(({ x, y, figura }) => (
            <span key={figura} className={estilos.retrato}
              style={{ left: `${x / 160 * 100}%`, top: `${y / 140 * 100}%`, backgroundImage: `url(/organizadores/personagens/p${figura}.svg)` }} />
          ))}
          <span className={estilos.nucleoPessoas}><SimboloOrbCommu /></span>
        </div>
        <div className={estilos.marcaCentral}><SimboloOrbCommu /><span>OrbCommu</span></div>
        <div className={estilos.folhas} aria-hidden="true">
          <div className={estilos.relatorio}>
            <span>Resumo da edição</span>
            <i /><i />
            <div className={estilos.barras}>
              {entradasAcumuladas.map(total => <b key={total} style={{ height: `${total / 12 * 100}%` }} />)}
            </div>
          </div>
        </div>
      </div>
      <div className={estilos.legendas}>
        <div><h3>Quem chamar quando abre uma vaga</h3><p>Consulte a ordem dos pedidos e decida quem convidar para o grupo.</p></div>
        <div><h3>Balanço para a equipe do evento</h3><p>Veja no exemplo quantos pedidos viraram entradas e leve esse resultado à conversa sobre a próxima edição.</p></div>
      </div>
    </article>
  )
}

function MapaDeOrigens({ automatico }: { automatico: boolean }) {
  const [ativa, selecionar] = useState(0)
  const [comPonteiro, definirPonteiro] = useState(false)
  const [comFoco, definirFoco] = useState(false)
  useEffect(() => {
    if (!automatico || comPonteiro || comFoco) return
    const timer = window.setInterval(() => selecionar(i => (i + 1) % origens.length), 2400)
    return () => window.clearInterval(timer)
  }, [automatico, comPonteiro, comFoco])

  return (
    <article className={estilos.quadro}>
      <div className={estilos.mapa} role="group" aria-label="Origens da divulgação"
        onMouseEnter={() => definirPonteiro(true)} onMouseLeave={() => definirPonteiro(false)}
        onFocus={() => definirFoco(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) definirFoco(false) }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={estilos.ramais} aria-hidden="true">
          {origens.map(({ nome, trajeto }, i) => (
            <g key={nome} data-ativo={ativa === i}>
              <path d={trajeto} />
              {ativa === i && <path className={estilos.pulso} d={trajeto} pathLength="100" />}
            </g>
          ))}
        </svg>
        <span className={estilos.centroMapa} aria-hidden="true"><SimboloOrbCommu /></span>
        {origens.map(({ nome, Icone, cliques }, i) => (
          <Button key={nome} variant="outline" size="icon" className={estilos.origem} type="button"
            aria-label={`${nome}, ${cliques} aberturas`} aria-pressed={ativa === i} title={nome}
            onMouseEnter={() => selecionar(i)} onFocus={() => selecionar(i)} onClick={() => selecionar(i)}>
            <Icone aria-hidden="true" />
          </Button>
        ))}
        <p aria-hidden="true" className={estilos.leituraOrigem}>{origens[ativa].nome}<br /><b>{origens[ativa].cliques} aberturas</b></p>
      </div>
      <div className={estilos.legenda}><h3>Onde voltar a divulgar</h3><p>Compare as aberturas do exemplo por canal para decidir onde divulgar a próxima edição.</p></div>
    </article>
  )
}

function CurvaDeEntradas() {
  const [indice, selecionar] = useState(pontos.length - 1)
  const ponto = pontos[indice]
  const dia = edicoes.nov.primeiroDia + indice
  const entradas = entradasAcumuladas[indice]
  const leitura = `${entradas} ${entradas === 1 ? "entrada confirmada" : "entradas confirmadas"}`

  function explorar(evento: PointerEvent<HTMLInputElement>) {
    if (evento.pointerType !== "mouse") return
    const caixa = evento.currentTarget.getBoundingClientRect()
    const fracao = (evento.clientX - caixa.left) / caixa.width
    selecionar(Math.max(0, Math.min(pontos.length - 1, Math.round(fracao * (pontos.length - 1)))))
  }

  return (
    <article className={estilos.quadro}>
      <div className={estilos.grafico}>
        <div className={estilos.leituraGrafico} aria-hidden="true"><span>{dia} nov</span><b>{leitura}</b></div>
        <svg viewBox="0 0 340 164" preserveAspectRatio="none" aria-hidden="true">
          {[40, 80, 120, 150].map(y => <path key={y} className={estilos.grade} d={`M 0 ${y} H 340`} />)}
          <path className={estilos.area} d={`${curva} V 150 H 20 Z`} />
          <path className={estilos.linha} d={curva} />
          <path className={estilos.guia} d={`M ${ponto.x} 5 V 150`} />
        </svg>
        <span className={estilos.marcador} style={{ left: `${ponto.x / 340 * 100}%`, top: `${ponto.y / 164 * 100}%` }} />
        <input type="range" aria-label="Dia da edição" aria-valuetext={`${dia} de novembro, ${leitura}`}
          min={0} max={pontos.length - 1} value={indice} onPointerMove={explorar}
          onChange={evento => selecionar(Number(evento.target.value))} />
        <div className={estilos.eixo} aria-hidden="true"><span>16 nov</span><span>22 nov</span></div>
      </div>
      <div className={estilos.legenda}><h3>Entradas ao longo da edição</h3><p>Percorra os dias da demonstração para ver como as entradas se acumularam até o encerramento.</p></div>
    </article>
  )
}

export function InkOrbitFeatures() {
  const ref = useRef<HTMLElement>(null)
  const automatico = useMovimento(ref)

  return (
    <section ref={ref} id="operacao" aria-labelledby="titulo-operacao" className={estilos.secao} data-animar={automatico}>
      <div className={estilos.painel}>
        <h2 id="titulo-operacao">Saiba quem chamar <span>e onde divulgar</span></h2>
        <FluxoDaEdicao />
        <div className={estilos.par}><MapaDeOrigens automatico={automatico} /><CurvaDeEntradas /></div>
      </div>
    </section>
  )
}
