import { situacaoValida } from "@/lib/fila"
import { listarExemplos, resumirExemplos } from "../../amostra"

const headers = { "Cache-Control": "no-store" }

export async function GET(request: Request, contexto: { params: Promise<{ recurso?: string[] }> }) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404, headers })
  const { recurso = [] } = await contexto.params
  const parametros = new URL(request.url).searchParams
  if (recurso.length === 1 && recurso[0] === "resumo") {
    const dias = parametros.get("dias") ?? "7"
    if (dias !== "7" && dias !== "30") return Response.json({ erro: "filtro" }, { status: 400, headers })
    return Response.json(resumirExemplos(dias === "7" ? 7 : 30), { headers })
  }
  if (recurso.length) return new Response(null, { status: 404, headers })
  const situacao = parametros.get("situacao") ?? "Todos"
  const pagina = Number(parametros.get("pagina") ?? 1)
  const tamanho = Number(parametros.get("tamanho") ?? 5)
  if (!situacaoValida(situacao) || !Number.isSafeInteger(pagina) || pagina < 1 || (tamanho !== 5 && tamanho !== 10 && tamanho !== 20)) {
    return Response.json({ erro: "filtro" }, { status: 400, headers })
  }
  return Response.json(listarExemplos({
    situacao, pagina, tamanho, busca: parametros.get("busca") ?? "", pedidoId: parametros.get("pedidoId") ?? undefined,
  }), { headers })
}
