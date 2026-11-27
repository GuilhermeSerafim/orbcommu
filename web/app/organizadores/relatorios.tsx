import { AtSign, Link2, Link2Off, QrCode } from "lucide-react"
import { edicoes, origens } from "@/lib/edicoes-exemplo"
import estilos from "./relatorios.module.css"

const icones = [QrCode, Link2, AtSign, Link2Off]
const cliquesPorOrigem = edicoes.nov.origens
const canais = origens.map((nome, i) => ({ nome, cliques: cliquesPorOrigem[i], Icone: icones[i] }))
  .sort((a, b) => b.cliques - a.cliques)
const total = canais.reduce((soma, canal) => soma + canal.cliques, 0)
const lider = canais[0]
const percentual = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 })

export function Relatorios() {
  return (
    <section id="relatorios" aria-labelledby="relatorios-titulo" className={estilos.secao}>
      <div className={estilos.conteudo}>
        <header className={estilos.cabecalho}>
          <h2 id="relatorios-titulo">De onde vêm os cliques?</h2>
          <p>O canal <strong>{lider.nome}</strong> liderou na demonstração, com <strong>{lider.cliques} dos {total} cliques</strong> ({percentual.format(lider.cliques / total)}). Compare os canais para decidir onde vale voltar a divulgar.</p>
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
        </div>
      </div>
    </section>
  )
}
