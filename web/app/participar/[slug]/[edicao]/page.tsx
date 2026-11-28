import { notFound } from "next/navigation"
import { cache } from "react"
import { EntradaLayout } from "@/components/comunidade"
import { metadadosDeCompartilhamento } from "@/lib/compartilhamento"
import { obterDivulgacao } from "@/lib/divulgacoes"
import { buscarFilaPublica, linkDeParticipacao } from "@/lib/filas-publicas"
import { mostrarDia } from "@/lib/periodo-divulgacao"
import Formulario from "../../../formulario"
import Abertura from "./abertura"

export const dynamic = "force-dynamic"
type Props = { params: Promise<{ slug: string; edicao: string }> }

const carregarEdicao = cache(async (slug: string, edicao: string) => {
  const fila = buscarFilaPublica(slug)
  if (!fila) notFound()
  const campanha = await obterDivulgacao(slug, edicao)
  if (!campanha) notFound()
  return { fila, campanha }
})

export async function generateMetadata({ params }: Props) {
  const { slug, edicao } = await params
  const { fila, campanha } = await carregarEdicao(slug, edicao)
  return {
    ...metadadosDeCompartilhamento({
      caminho: `${linkDeParticipacao(fila)}/${campanha.id}`,
      titulo: `${campanha.nome} · OrbCommu`,
      descricao: `Consulte esta divulgação e a disponibilidade para pedir entrada ${fila.destino}.`,
      imagem: fila.imagemDePrevia,
    }),
    robots: { index: false },
  }
}

export default async function PaginaDaEdicao({ params }: Props) {
  const { slug, edicao } = await params
  const { fila, campanha } = await carregarEdicao(slug, edicao)
  return <EntradaLayout fila={fila}>
    <p className="nome-evento">{campanha.nome}</p>
    {campanha.estado === "Aberta" ? <>
      <Abertura key={edicao} slug={slug} edicao={edicao} />
      <Formulario divulgacao={edicao} fila={{ slug, titulo: fila.titulo, destino: fila.destino }} />
    </> : <section className="formulario-area">
      <h1>{campanha.estado === "Agendada" ? "A divulgação ainda não abriu" : "Divulgação encerrada"}</h1>
      {campanha.estado === "Agendada" && <p className="introducao">Volte em {mostrarDia(campanha.inicio)} para pedir entrada.</p>}
    </section>}
  </EntradaLayout>
}
