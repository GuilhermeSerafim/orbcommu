import { BotaoDemonstracao } from "./inscricao"
import estilos from "./landing.module.css"

export const secoes = [
  ["como-funciona", "Como funciona"],
  ["distribuicao", "Distribuição"],
  ["relatorios", "Relatórios"],
  ["planos", "Planos"],
  ["duvidas", "Dúvidas"],
] as const

const etapas = [
  ["Pedido", "A pessoa pede entrada", "Quem chega pelo link ou pelo QR do encontro preenche o formulário pelo celular."],
  ["Análise", "A equipe confere", "Os pedidos aparecem em ordem de chegada. A equipe aprova quem pode receber o convite."],
  ["Entrada", "Abriu uma vaga?", "A equipe chama pelo WhatsApp e confirma a entrada depois de conferir o grupo."],
]

const perguntas = [
  ["Como solicito uma demonstração?", "Selecione “Solicitar demonstração”, escolha e-mail ou WhatsApp e informe um contato para entrar na fila de organizadores."],
  ["O que acontece depois da inscrição?", "Você recebe a confirmação na tela e aguarda na fila da demonstração."],
  ["Quem aprova a entrada de participantes?", "A equipe da comunidade analisa os pedidos. Quando surge uma vaga, ela decide quem chamar e envia o convite pelo WhatsApp."],
  ["O que acontece quando um grupo lota?", "Os pedidos aprovados ficam aguardando vaga. A simulação de distribuição mostra como grupos com espaço podem receber as próximas pessoas."],
  ["Como o OrbCommu identifica a origem dos acessos?", "Cada divulgação pode usar um link ou QR identificado. Um link encaminhado mantém a origem da divulgação em que foi criado."],
  ["O que a organização recebe por edição?", "A proposta por edição reúne uma campanha com uma comunidade parceira e um resumo agregado das aberturas, pedidos e entradas confirmadas."],
]

export function ComoFunciona() {
  return (
    <section id="como-funciona" className={estilos.comoFunciona} aria-labelledby="titulo-como-funciona">
      <div className={estilos.largura}>
        <h2 id="titulo-como-funciona">Do primeiro clique à entrada no grupo.</h2>
        <div className={estilos.etapas}>
          {etapas.map(([etapa, titulo, texto]) => (
            <article key={etapa}>
              <small>{etapa}</small>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
        <div className={estilos.responsabilidades}>
          <article>
            <h3>Para a comunidade</h3>
            <p>Veja quem aguarda análise, quem espera uma vaga e para quem o convite já foi enviado.</p>
          </article>
          <article>
            <h3>Para quem organiza o evento</h3>
            <p>Acompanhe quantas pessoas chegaram pela sua edição e quantas entraram na comunidade.</p>
          </article>
        </div>
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
          <p className={estilos.introducaoPlanos}>Conheça o OrbCommu em uma demonstração ou converse sobre uma edição do seu evento.</p>
          <div className={estilos.opcoesPlanos}>
            <article>
              <h3>Demonstração</h3>
              <p>Para quem quer conhecer a fila de entrada e ver como a equipe recebe e convida participantes.</p>
              <dl>
                <div><dt>Disponibilidade</dt><dd>Lista de espera</dd></div>
                <div><dt>Para solicitar</dt><dd>E-mail ou WhatsApp</dd></div>
              </dl>
              <BotaoDemonstracao />
            </article>
            <article>
              <h3>Por edição</h3>
              <p>Para organizar uma campanha com a comunidade parceira e acompanhar o que a divulgação trouxe.</p>
              <dl>
                <div><dt>Investimento</dt><dd>Sob consulta</dd></div>
                <div><dt>Entrega</dt><dd>Resumo da edição</dd></div>
              </dl>
              <BotaoDemonstracao interesse="edicao" />
            </article>
          </div>
        </div>
      </section>
      <section id="duvidas" className={estilos.duvidas} aria-labelledby="titulo-duvidas">
        <div className={estilos.larguraFechamento}>
          <h2 id="titulo-duvidas">Dúvidas frequentes</h2>
          <div>
            {perguntas.map(([pergunta, resposta]) => (
              <details key={pergunta}>
                <summary>{pergunta}</summary>
                <p>{resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className={estilos.chamadaFinal} aria-labelledby="titulo-chamada-final">
        <div className={estilos.larguraFechamento}>
          <h2 id="titulo-chamada-final">Quer ver a fila da sua comunidade em ação?</h2>
          <p>Deixe um contato para entrar na fila da demonstração do OrbCommu.</p>
          <div className={estilos.acoesFinais}>
            <BotaoDemonstracao />
            <a href="#planos">Comparar planos</a>
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
        <a className={estilos.marcaRodape} href="#inicio">OrbCommu</a>
        <nav aria-label="Rodapé">
          {secoes.slice(1).map(([id, nome]) => <a key={id} href={`#${id}`}>{nome}</a>)}
          <a href="/entrar">Entrar como equipe</a>
        </nav>
      </div>
    </footer>
  )
}
