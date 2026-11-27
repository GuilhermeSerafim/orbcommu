import { getPool } from "./db"
import type { PedidoValido } from "./entrada"

export const COMUNIDADE = "meet-up-tech-sp"

export async function registrarPedido(pedido: PedidoValido): Promise<void> {
  await getPool().query(
    `insert into orbcommu.pedidos (comunidade, nome, telefone, motivacao, origem, situacao)
     values ($1, $2, $3, $4, 'Link geral', 'Para analisar')
     on conflict (comunidade, telefone) where encerrado_em is null do nothing`,
    [COMUNIDADE, pedido.nome, pedido.telefone, pedido.motivacao],
  )
}
