import { registrarAbertura } from "@/lib/divulgacoes"
import { buscarFilaPublica } from "@/lib/filas-publicas"
import { uuidValido } from "@/lib/periodo-divulgacao"

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!buscarFilaPublica(slug)) return new Response(null, { status: 404 })
  const dados = await req.json().catch(() => null)
  if (typeof dados?.edicao !== "string" || !uuidValido(dados.edicao) ||
      typeof dados.visita !== "string" || !uuidValido(dados.visita)) return new Response(null, { status: 400 })
  await registrarAbertura(slug, dados.edicao, dados.visita)
  return new Response(null, { status: 204 })
}
