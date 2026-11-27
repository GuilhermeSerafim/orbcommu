"use client"

import { useRef, useSyncExternalStore } from "react"
import { useInView } from "motion/react"
import CountUp from "@/components/ui/count-up"
import { edicoes } from "@/lib/edicoes-exemplo"
import estilos from "./comparacao.module.css"

const { out: outubro, nov: novembro } = edicoes
const taxaOutubro = outubro.entradas / outubro.pedidos
const taxaNovembro = novembro.entradas / novembro.pedidos

const indicadores = [
  {
    titulo: "Pedidos de entrada",
    valor: Math.round(100 * (novembro.pedidos - outubro.pedidos) / outubro.pedidos),
    unidade: "%",
    descricao: `De ${outubro.pedidos} para ${novembro.pedidos} pedidos.`,
  },
  {
    titulo: "Entradas confirmadas",
    valor: novembro.entradas - outubro.entradas,
    unidade: "",
    descricao: `De ${outubro.entradas} para ${novembro.entradas} pessoas na comunidade.`,
    destaque: true,
  },
  {
    titulo: "Conversão de pedidos em entradas",
    valor: Math.round(100 * (taxaNovembro - taxaOutubro)),
    unidade: " p.p.",
    descricao: `Em outubro, ${Math.round(10 * taxaOutubro)} de cada 10 pedidos viraram entrada. Em novembro, foram ${Math.round(10 * taxaNovembro)} de cada 10.`,
  },
]

const preferenciaMovimento = "(prefers-reduced-motion: reduce)"
function observarPreferencia(notificar: () => void) {
  const consulta = window.matchMedia(preferenciaMovimento)
  consulta.addEventListener("change", notificar)
  return () => consulta.removeEventListener("change", notificar)
}
const lerPreferencia = () => window.matchMedia(preferenciaMovimento).matches
const preferenciaNoServidor = () => false

export function ComparacaoEdicoes() {
  const faixa = useRef<HTMLDListElement>(null)
  const visivel = useInView(faixa, { once: true, amount: 0.2 })
  const reduzido = useSyncExternalStore(observarPreferencia, lerPreferencia, preferenciaNoServidor)

  return (
    <section id="comparacao-edicoes" className={estilos.secao} aria-labelledby="titulo-comparacao">
      <div className={estilos.conteudo}>
        <h2 id="titulo-comparacao">O que mudou de uma edição para a outra?</h2>
        <p className={estilos.periodo}>Outubro → novembro · dados de exemplo</p>
        <dl ref={faixa} className={estilos.faixa}>
          {indicadores.map(({ titulo, valor, unidade, descricao, destaque }) => (
            <div key={titulo} className={destaque ? estilos.destaque : undefined}>
              <dt>{titulo}</dt>
              <dd>
                <span className={estilos.numero} aria-hidden="true">
                  {valor > 0 && "+"}<CountUp to={valor} startWhen={visivel} reducedMotion={reduzido} />
                  {unidade && <span className={estilos.unidade}>{unidade}</span>}
                </span>
                <span className="sr-only">{valor > 0 && "+"}{valor}{unidade === " p.p." ? " pontos percentuais" : unidade}</span>
                <p>{descricao}</p>
              </dd>
            </div>
          ))}
        </dl>
        <details className={estilos.piloto}>
          <summary>Como vamos medir o tempo da equipe no piloto?</summary>
          <p>Em cada edição, vamos somar os minutos que a equipe dedica a analisar pedidos, enviar convites e confirmar entradas. Dividindo esse total pelo número de pedidos tratados, podemos comparar o tempo por pedido no processo atual e no OrbCommu.</p>
        </details>
      </div>
    </section>
  )
}
