import type { Metadata } from "next"
import { BotaoDemonstracao, InscricaoProvider } from "./inscricao"
import estilos from "./landing.module.css"

export const metadata: Metadata = {
  title: "OrbCommu · Para organizadores",
  description: "Receba os pedidos em ordem de chegada e convide pelo WhatsApp quando surgir uma vaga.",
}

export default function Organizadores() {
  return (
    <InscricaoProvider>
      <main className={estilos.abertura}>
        <section className={estilos.hero} aria-labelledby="organizadores-titulo">
          <h1 id="organizadores-titulo">
            Uma fila para organizar a entrada na sua comunidade<span>.</span>
          </h1>
          <p>Receba os pedidos em ordem de chegada e convide pelo WhatsApp quando surgir uma vaga.</p>
          <BotaoDemonstracao />
          <p className={estilos.nota}>Deixe seu contato para entrar na fila da demonstração.</p>
        </section>
      </main>
    </InscricaoProvider>
  )
}
