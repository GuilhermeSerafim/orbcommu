import { validarEntrada, type PedidoValido } from "./entrada"

export async function receberPedido(requisicao: Request, gravar: (pedido: PedidoValido) => Promise<void>): Promise<Response> {
  let entrada: unknown
  try {
    entrada = await requisicao.json()
  } catch {
    return Response.json({ erro: "json_invalido" }, { status: 400 })
  }
  const resultado = validarEntrada(entrada)
  if (!resultado.ok) return Response.json({ campos: resultado.campos }, { status: 422 })
  try {
    await gravar(resultado.pedido)
  } catch {
    return Response.json({ erro: "indisponivel" }, { status: 503 })
  }
  return Response.json({ recebido: true })
}
