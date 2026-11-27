import type { Metadata } from "next"
import { Abertura } from "@/components/ui/modren-and-stunning-hero-section"
import { InkOrbitFeatures } from "@/components/ui/ink-orbit-features"
import { ComparacaoEdicoes } from "./comparacao"
import { Distribuicao } from "./distribuicao"
import { BotaoDemonstracao, InscricaoProvider } from "./inscricao"
import { Relatorios } from "./relatorios"
import { ComoFunciona, Fechamento, Rodape, secoes } from "./secoes"

export const metadata: Metadata = {
  title: "OrbCommu · Para organizadores",
  description: "Receba os pedidos em ordem de chegada e convide pelo WhatsApp quando surgir uma vaga.",
}

export default function Organizadores() {
  return (
    <InscricaoProvider>
      <main>
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
