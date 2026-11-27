import { obterAcesso } from "../../../lib/acesso"
import { listarPedidos, situacaoValida } from "../../../lib/fila"

const headers = { "Cache-Control": "private, no-store" }
const idValido = (id: string) => /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n
export async function GET(request: Request) {
  try {
    const acesso = await obterAcesso()
    if (acesso.tipo !== "operador") {
      return Response.json({ erro: "acesso" }, { status: acesso.tipo === "anonimo" ? 401 : 403, headers })
    }
    const params = new URL(request.url).searchParams
    const pedidoId = params.get("pedidoId") ?? undefined
    const chamadasNaPagina = params.getAll("chamada")
    const pagina = Number(params.get("pagina") ?? 1)
    const tamanho = Number(params.get("tamanho") ?? 5)
    const situacao = params.get("situacao") ?? "Todos"
    if (!Number.isSafeInteger(pagina) || pagina < 1
      || (tamanho !== 5 && tamanho !== 10 && tamanho !== 20)
      || (pedidoId !== undefined && !idValido(pedidoId))
      || chamadasNaPagina.length > tamanho || !chamadasNaPagina.every(idValido)
      || !situacaoValida(situacao)) {
      return Response.json({ erro: "filtro" }, { status: 400, headers })
    }
    const dados = await listarPedidos(acesso, { pedidoId, busca: params.get("busca") ?? "", pagina, tamanho, situacao }, chamadasNaPagina)
    return Response.json(dados, { headers })
  } catch {
    return Response.json({ erro: "indisponivel" }, { status: 503, headers })
  }
}
