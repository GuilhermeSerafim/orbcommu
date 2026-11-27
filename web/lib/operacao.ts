import "server-only"
import type { Acesso } from "./acesso"
import { getPool } from "./db"

const atualizacoes = {
  conversar: "conversado_em = statement_timestamp(), conversado_por = $3, conversado_por_nome = $4",
  aprovar: "situacao = 'Aguardando vaga', aprovado_em = statement_timestamp(), aprovado_por = $3, aprovado_por_nome = $4",
  encerrar: "situacao = 'Encerrado na vistoria', encerrado_em = statement_timestamp(), encerrado_por = $3, encerrado_por_nome = $4",
} as const

export type AcaoPedido = keyof typeof atualizacoes
export type ResultadoAcao = { ok: true; urlWhatsApp?: string } | {
  ok: false
  motivo: "acesso" | "acao_invalida" | "pedido_alterado" | "indisponivel"
}

export async function executarVistoria(acesso: Acesso, id: string, acao: AcaoPedido): Promise<ResultadoAcao> {
  if (acesso.tipo !== "operador" || acesso.perfil !== "operacao") return { ok: false, motivo: "acesso" }
  if (typeof id !== "string" || !/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n
    || typeof acao !== "string" || !Object.hasOwn(atualizacoes, acao)) {
    return { ok: false, motivo: "acao_invalida" }
  }

  const { rows } = await getPool().query<{ telefone: string }>(
    `update orbcommu.pedidos p set ${atualizacoes[acao]}
     from orbcommu.operadores o
     where p.id = $1 and p.comunidade = $2 and p.situacao = 'Para analisar' and p.encerrado_em is null
       and o.comunidade = p.comunidade and o.usuario_id = $3 and o.perfil = 'operacao'
     returning p.telefone`,
    [id, acesso.comunidade, acesso.usuarioId, acesso.nomeExibicao ?? "Operador da equipe"],
  )
  if (!rows.length) return { ok: false, motivo: "pedido_alterado" }
  return acao === "conversar" ? { ok: true, urlWhatsApp: "https://wa.me/" + rows[0].telefone } : { ok: true }
}
