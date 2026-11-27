import "server-only"
import type { Acesso } from "./acesso"
import { getPool } from "./db"

export type FiltroFila = { busca: string; situacao: "Todos" | "Para analisar"; pagina: number; tamanho: 5 | 10 | 20 }
export type ItemFila = { id: string; nome: string; telefone: string; motivacao: string | null; origem: string; situacao: string; recebidoEm: string }
export type PaginaFila = { itens: ItemFila[]; total: number }

export async function listarPedidos(operador: Extract<Acesso, { tipo: "operador" }>, filtro: FiltroFila): Promise<PaginaFila> {
  const { busca, situacao, pagina, tamanho } = filtro
  if (![5, 10, 20].includes(tamanho) || !Number.isSafeInteger(pagina) || pagina < 1) {
    throw new RangeError("Paginação inválida.")
  }
  const digitos = /^[+()\d\s.-]+$/.test(busca) ? busca.replace(/\D/g, "") : ""
  const { rows } = await getPool().query<PaginaFila>(
    `with filtrados as (
       select id, nome, telefone, motivacao, origem, situacao, recebido_em
       from orbcommu.pedidos
       where comunidade = $1 and encerrado_em is null
         and ($2 = 'Todos' or situacao = $2)
         and (strpos(lower(nome), lower($3)) > 0 or ($4 <> '' and strpos(telefone, $4) > 0))
     ), pagina as (
       select id::text, nome, telefone, motivacao, origem, situacao, recebido_em as "recebidoEm"
       from filtrados order by recebido_em, filtrados.id limit $5 offset $6
     )
     select (select count(*)::int from filtrados) as total,
            coalesce((select json_agg(p order by "recebidoEm", id::bigint) from pagina p), '[]') as itens`,
    [operador.comunidade, situacao, busca.trim(), digitos, tamanho, (BigInt(pagina - 1) * BigInt(tamanho)).toString()],
  )
  return rows[0]
}
