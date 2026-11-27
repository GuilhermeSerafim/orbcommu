import { notFound } from "next/navigation"
import { EntradaLayout } from "@/components/comunidade"
import { obterDivulgacao } from "@/lib/divulgacoes"
import { buscarFilaPublica } from "@/lib/filas-publicas"
import { mostrarDia } from "@/lib/periodo-divulgacao"
import Formulario from "../../../formulario"
import Abertura from "./abertura"

export const dynamic = "force-dynamic"
export const metadata = { title: "Divulgação · OrbCommu", robots: { index: false } }

export default async function PaginaDaEdicao({ params }: Readonly<{ params: Promise<{ slug: string; edicao: string }> }>) {
  const { slug, edicao } = await params
  const fila = buscarFilaPublica(slug)
  if (!fila) notFound()
  const campanha = await obterDivulgacao(slug, edicao)
  if (!campanha) notFound()
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
