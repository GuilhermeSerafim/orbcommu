import "server-only"
import type { Acesso } from "./acesso"
import { getPool } from "./db"

export const situacoesFila = ["Todos", "Para analisar", "Aguardando vaga", "Envio a confirmar", "Convite enviado", "Finalizados"] as const
type SituacaoFila = typeof situacoesFila[number]

export function situacaoValida(valor: string): valor is SituacaoFila {
  return situacoesFila.some(situacao => situacao === valor)
}

export type FiltroFila = { pedidoId?: string; busca: string; situacao: SituacaoFila; pagina: number; tamanho: 5 | 10 | 20 }
export type ItemFila = {
  id: string
  nome: string
  telefone: string
  motivacao: string | null
  origem: string
  situacao: string
  recebidoEm: string
  conversadoEm: string | null
  conversadoPorNome: string | null
  reservaId: string | null
  enviadoEm: string | null
  enviadoPorNome: string | null
  aprovadoEm: string | null
  aprovadoPor: string | null
  aprovadoPorNome: string | null
  encerradoEm: string | null
  encerradoPorNome: string | null
}
export type PaginaFila = { itens: ItemFila[]; total: number }

export async function listarPedidos(operador: Extract<Acesso, { tipo: "operador" }>, filtro: FiltroFila): Promise<PaginaFila> {
  const { busca, situacao, pagina, tamanho } = filtro
  if (![5, 10, 20].includes(tamanho) || !Number.isSafeInteger(pagina) || pagina < 1) {
    throw new RangeError("Paginação inválida.")
  }
  const digitos = /^[+()\d\s.-]+$/.test(busca) ? busca.replace(/\D/g, "") : ""
  const { rows } = await getPool().query<PaginaFila>(
    `with filtrados as (
       select id, nome, telefone, motivacao, origem, situacao, recebido_em, conversado_em, conversado_por_nome,
              reserva_id, enviado_em, enviado_por_nome, aprovado_em, aprovado_por, aprovado_por_nome, encerrado_em, encerrado_por_nome
       from orbcommu.pedidos
       where comunidade = $1
         and ($7::bigint is null or id = $7)
         and ($2 = 'Todos' or ($2 = 'Finalizados' and encerrado_em is not null)
                           or (situacao = $2 and encerrado_em is null))
         and (strpos(lower(nome), lower($3)) > 0 or ($4 <> '' and strpos(telefone, $4) > 0))
     ), pagina as (
       select id::text, nome, telefone, motivacao, origem, situacao, recebido_em as "recebidoEm",
              conversado_em as "conversadoEm", conversado_por_nome as "conversadoPorNome",
              reserva_id as "reservaId", enviado_em as "enviadoEm", enviado_por_nome as "enviadoPorNome",
              aprovado_em as "aprovadoEm", aprovado_por as "aprovadoPor", aprovado_por_nome as "aprovadoPorNome",
              encerrado_em as "encerradoEm", encerrado_por_nome as "encerradoPorNome"
       from filtrados order by recebido_em, filtrados.id limit $5 offset $6
     )
     select (select count(*)::int from filtrados) as total,
            coalesce((select json_agg(p order by "recebidoEm", id::bigint) from pagina p), '[]') as itens`,
    [operador.comunidade, situacao === "Envio a confirmar" ? "Chamada iniciada" : situacao, busca.trim(), digitos, tamanho, (BigInt(pagina - 1) * BigInt(tamanho)).toString(), filtro.pedidoId ?? null],
  )
  return rows[0]
}
