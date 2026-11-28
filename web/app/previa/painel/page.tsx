import { notFound } from "next/navigation"
import { Cabecalho } from "@/components/cabecalho"
import { situacoesFila } from "@/lib/fila"
import Listagem from "../../fila/listagem"
import "../../fila/fila.css"

export const metadata = { title: "Prévia do painel · OrbCommu", robots: { index: false, follow: false } }

export default function PreviaPainel() {
  if (process.env.NODE_ENV !== "development") notFound()
  return <>
    <Cabecalho />
    <main className="painel">
      <header className="painel-titulo">
        <span className="comunidade-id">Meet Up Tech SP · Dados de exemplo</span>
        <h1>Fila de entrada</h1>
      </header>
      <Listagem podeOperar={false} situacoes={situacoesFila} api="/previa/painel/dados" />
    </main>
  </>
}
