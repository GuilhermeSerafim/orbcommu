import { registrarPedido } from "../../../lib/pedidos"
import { receberPedido } from "../../../lib/receber"

export function POST(requisicao: Request) {
  return receberPedido(requisicao, registrarPedido)
}
