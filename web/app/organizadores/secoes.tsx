import { BotaoDemonstracao } from "./inscricao"
import { AcordeaoDuvidas } from "./acordeao-duvidas"
import { SimboloOrbCommu } from "@/components/marca-orbcommu"
import { PlusIcon } from "lucide-react"
import estilos from "./landing.module.css"

export const secoes = [
  ["como-funciona", "Como funciona"],
  ["distribuicao", "Distribuição"],
  ["relatorios", "Relatórios"],
  ["planos", "Planos"],
  ["duvidas", "Dúvidas"],
] as const

const etapas = [
  ["Inscrição", "Divulgue um único formulário", "Compartilhe o link ou mostre o QR no encontro. Cada pessoa envia o próprio pedido pelo celular."],
  ["Fila", "Veja quem espera pela vaga", "Os pedidos aparecem em ordem de chegada. Sua equipe analisa cada inscrição e aprova quem pode receber o convite."],
  ["Convite", "Chame a próxima pessoa", "Quando uma vaga abrir, envie o convite pelo WhatsApp. Depois de conferir quem entrou, registre a confirmação na fila."],
]

const perguntas = [
  ["Serve para um workshop de 20 vagas?", "Se a sua equipe recebe pedidos e chama participantes quando abre vaga, esse é o fluxo que você pode conhecer na demonstração. O piloto acompanha a entrada nos grupos da comunidade parceira."],
  ["Quem decide quem recebe o convite?", "Sua equipe. Os pedidos chegam em ordem, e vocês analisam, aprovam e chamam cada pessoa pelo WhatsApp."],
  ["E se o grupo já estiver lotado?", "O pedido aprovado continua na fila. Quando houver espaço, a equipe pode convidar a próxima pessoa e conferir a entrada."],
  ["Como sei qual divulgação trouxe cliques?", "Cada canal pode ter um link identificado ou um QR. Quando alguém abre esse link, o clique fica associado à divulgação de origem."],
  ["Quanto custa uma edição?", "O valor é sob consulta. A proposta reúne uma campanha com a comunidade parceira e um resumo de cliques, pedidos e entradas confirmadas."],
  ["Quando vou ver a demonstração?", "Ao enviar seu e-mail ou WhatsApp, você recebe a confirmação na tela e aguarda na fila. A inscrição não marca uma data."],
] as const

export function ComoFunciona() {
  return (
    <section id="como-funciona" className={estilos.comoFunciona} aria-labelledby="titulo-como-funciona">
      <div className={estilos.largura}>
        <h2 id="titulo-como-funciona">Do pedido ao convite, em três passos.</h2>
        <div className={estilos.etapas}>
          {etapas.map(([etapa, titulo, texto]) => (
            <article key={etapa}>
              <small>{etapa}</small>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
        <aside className={estilos.pesquisa} aria-labelledby="titulo-pesquisa">
          <h3 id="titulo-pesquisa">Por que criamos essa fila</h3>
          <p>Na pesquisa que deu origem ao OrbCommu, uma administradora de comunidade contou que recebeu muitos pedidos por cerca de três dias depois de uma divulgação. A equipe conferia os cadastros em uma planilha.</p>
        </aside>
      </div>
    </section>
  )
}

export function Fechamento() {
  return (
    <div className={estilos.fechamento}>
      <section id="planos" className={estilos.planos} aria-labelledby="titulo-planos">
        <div className={estilos.larguraFechamento}>
          <h2 id="titulo-planos">Compare os planos</h2>
          <p className={estilos.introducaoPlanos}>Entre na fila para conhecer a operação. Se já tem um evento em vista, você também pode registrar interesse em uma edição.</p>
          <div className={estilos.opcoesPlanos}>
            <article>
              <h3>Demonstração</h3>
              <p>Conheça a fila pela perspectiva de quem organiza. Veja como um pedido chega, como a equipe convida e quando a entrada aparece como confirmada.</p>
              <dl>
                <div><dt>Disponibilidade</dt><dd>Lista de espera</dd></div>
                <div><dt>Para solicitar</dt><dd>E-mail ou WhatsApp</dd></div>
              </dl>
              <BotaoDemonstracao />
            </article>
            <article>
              <h3>Por edição</h3>
              <p>Divulgue uma edição com a comunidade parceira. Use os totais de cliques, pedidos e entradas confirmadas para planejar a próxima divulgação.</p>
              <dl>
                <div><dt>Investimento</dt><dd>Sob consulta</dd></div>
                <div><dt>Entrega</dt><dd>Campanha e resumo da edição</dd></div>
              </dl>
              <BotaoDemonstracao interesse="edicao" />
            </article>
          </div>
        </div>
      </section>
      <section id="duvidas" className={estilos.duvidas} aria-labelledby="titulo-duvidas">
        <div className={estilos.larguraFechamento}>
          <h2 id="titulo-duvidas">Dúvidas frequentes</h2>
          <AcordeaoDuvidas perguntas={perguntas} />
          <noscript>
            {perguntas.map(([pergunta, resposta]) => (
              <details key={pergunta} className={estilos.itemDuvida}>
                <summary className={estilos.pergunta}>{pergunta}<PlusIcon aria-hidden="true" /></summary>
                <p className={estilos.resposta}>{resposta}</p>
              </details>
            ))}
          </noscript>
        </div>
      </section>
      <section className={estilos.chamadaFinal} aria-labelledby="titulo-chamada-final">
        <div className={estilos.larguraFechamento}>
          <h2 id="titulo-chamada-final">Quem você vai chamar na próxima vaga?</h2>
          <p>Veja como sua equipe pode cuidar da fila do próximo workshop ou evento. Deixe um e-mail ou WhatsApp para entrar na lista de espera da demonstração.</p>
          <div className={estilos.acoesFinais}>
            <BotaoDemonstracao />
          </div>
        </div>
      </section>
    </div>
  )
}

export function Rodape() {
  return (
    <footer className={estilos.rodape}>
      <div className={estilos.larguraFechamento}>
        <a className={`marca ${estilos.marcaRodape}`} href="#inicio"><SimboloOrbCommu />OrbCommu</a>
        <nav aria-label="Rodapé">
          {secoes.slice(1).map(([id, nome]) => <a key={id} href={`#${id}`}>{nome}</a>)}
          <a href="/entrar">Entrar como equipe</a>
        </nav>
      </div>
    </footer>
  )
}
