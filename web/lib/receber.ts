import { validarEntrada, type PedidoValido } from "./entrada"

export async function receberPedido(requisicao: Request, gravar: (pedido: PedidoValido) => Promise<void | "encerrada" | "agendada" | "invalida">): Promise<Response> {
  let entrada: unknown
  try {
    entrada = await requisicao.json()
  } catch {
    return Response.json({ erro: "json_invalido" }, { status: 400 })
  }
  const resultado = validarEntrada(entrada)
  if (!resultado.ok) return Response.json({ campos: resultado.campos }, { status: 422 })
  try {
    const estado = await gravar(resultado.pedido)
    if (estado) {
      const status = { encerrada: 410, agendada: 409, invalida: 404 }[estado]
      return Response.json({ erro: estado }, { status })
    }
  } catch {
    return Response.json({ erro: "indisponivel" }, { status: 503 })
  }
  return Response.json({ recebido: true })
}
