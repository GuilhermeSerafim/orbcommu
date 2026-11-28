import { notFound } from "next/navigation"
import { EntradaLayout } from "@/components/comunidade"
import { metadadosDeCompartilhamento } from "@/lib/compartilhamento"
import { buscarFilaPublica, filasPublicas, linkDeParticipacao } from "@/lib/filas-publicas"
import Formulario from "../../formulario"

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return filasPublicas.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props) {
  const fila = buscarFilaPublica((await params).slug)
  if (!fila) notFound()
  return metadadosDeCompartilhamento({
    caminho: linkDeParticipacao(fila),
    titulo: `${fila.titulo} · OrbCommu`,
    descricao: `Envie seu pedido de entrada ${fila.destino}. A equipe da comunidade analisa o pedido e pode entrar em contato pelo WhatsApp.`,
    imagem: fila.imagemDePrevia,
  })
}

export default async function Participar({ params }: Props) {
  const fila = buscarFilaPublica((await params).slug)
  if (!fila) notFound()
  return <EntradaLayout fila={fila}><Formulario fila={{ slug: fila.slug, titulo: fila.titulo, destino: fila.destino }} /></EntradaLayout>
}
