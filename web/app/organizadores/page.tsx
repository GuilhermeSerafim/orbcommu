import type { Metadata } from "next"
import { Abertura } from "@/components/ui/modren-and-stunning-hero-section"
import { Distribuicao } from "./distribuicao"
import { BotaoDemonstracao, InscricaoProvider } from "./inscricao"
import { Relatorios } from "./relatorios"

export const metadata: Metadata = {
  title: "OrbCommu · Para organizadores",
  description: "Receba os pedidos em ordem de chegada e convide pelo WhatsApp quando surgir uma vaga.",
}

export default function Organizadores() {
  return (
    <InscricaoProvider>
      <main>
        <Abertura chamada={<BotaoDemonstracao />} />
        <Distribuicao />
        <Relatorios />
      </main>
    </InscricaoProvider>
  )
}
