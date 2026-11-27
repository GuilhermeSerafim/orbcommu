import type { Metadata } from "next"
import { Abertura } from "@/components/ui/modren-and-stunning-hero-section"
import { InkOrbitFeatures } from "@/components/ui/ink-orbit-features"
import { ComparacaoEdicoes } from "./comparacao"
import { Distribuicao } from "./distribuicao"
import { BotaoDemonstracao, InscricaoProvider } from "./inscricao"
import { Relatorios } from "./relatorios"
import { ComoFunciona, Fechamento, Rodape, secoes } from "./secoes"
import estilos from "./landing.module.css"

export const metadata: Metadata = {
  title: "Inscrições e filas de espera para turmas e eventos | OrbCommu",
  description: "Com o OrbCommu, escolas e organizadoras de eventos acompanham as vagas, consultam a fila de espera e enviam o próximo convite pelo WhatsApp.",
}

export default function Organizadores() {
  return (
    <InscricaoProvider>
      <main className={estilos.pagina}>
        <Abertura chamada={<BotaoDemonstracao />} navegacao={(
          <nav aria-label="Seções">
            {secoes.map(([id, nome]) => <a key={id} href={`#${id}`}>{nome}</a>)}
            <a href="/entrar">Entrar como equipe</a>
          </nav>
        )} />
        <ComoFunciona />
        <Distribuicao />
        <Relatorios />
        <InkOrbitFeatures />
        <ComparacaoEdicoes />
        <Fechamento />
      </main>
      <Rodape />
    </InscricaoProvider>
  )
}
