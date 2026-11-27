import { buscarFilaPublica } from "@/lib/filas-publicas"
import { registrarPedidoDaDivulgacao } from "@/lib/divulgacoes"
import { registrarPedidoNaFila } from "@/lib/pedidos"
import { receberPedido } from "@/lib/receber"

export async function POST(requisicao: Request, { params }: { params: Promise<{ slug: string }> }) {
  const fila = buscarFilaPublica((await params).slug)
  if (!fila) return Response.json({ erro: "fila_desconhecida" }, { status: 404 })

  const parametros = new URL(requisicao.url).searchParams
  const edicoes = parametros.getAll("edicao")
  if (edicoes.length > 0) {
    if (edicoes.length !== 1) return Response.json({ erro: "invalida" }, { status: 404 })
    return receberPedido(requisicao, pedido => registrarPedidoDaDivulgacao(fila.slug, edicoes[0], pedido))
  }
  const origens = parametros.getAll("origem")
  const [origem] = origens
  const origemValida = origens.length === 1 && origem.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(origem)
  return receberPedido(requisicao, pedido => registrarPedidoNaFila(fila.slug, origemValida ? origem : "Link geral", pedido))
}
