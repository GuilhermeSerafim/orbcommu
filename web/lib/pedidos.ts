import { getPool } from "./db"
import type { PedidoValido } from "./entrada"
import { meetUpTechSP } from "./filas-publicas"

export const COMUNIDADE = meetUpTechSP.slug

export function registrarPedido(pedido: PedidoValido): Promise<void> {
  return registrarPedidoNaFila(COMUNIDADE, "Link geral", pedido)
}

export async function registrarPedidoNaFila(comunidade: string, origem: string, pedido: PedidoValido): Promise<void> {
  await getPool().query(
    `insert into orbcommu.pedidos (comunidade, nome, telefone, motivacao, origem, situacao)
     values ($1, $2, $3, $4, $5, 'Para analisar')
     on conflict (comunidade, telefone) where encerrado_em is null do nothing`,
    [comunidade, pedido.nome, pedido.telefone, pedido.motivacao, origem],
  )
}
