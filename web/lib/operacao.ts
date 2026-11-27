import "server-only"
import type { Acesso } from "./acesso"
import { getPool } from "./db"
import { consultarConvite } from "./configuracao-convite"
import { conversaDeConvite } from "./convite"

const atualizacoes = {
  conversar: "conversado_em = statement_timestamp(), conversado_por = $3, conversado_por_nome = $4",
  aprovar: "situacao = 'Aguardando vaga', aprovado_em = statement_timestamp(), aprovado_por = $3, aprovado_por_nome = $4",
  encerrar: "situacao = 'Encerrado na vistoria', encerrado_em = statement_timestamp(), encerrado_por = $3, encerrado_por_nome = $4",
} as const

const desfechos = {
  confirmar_entrada: "Entrada confirmada",
  desistir: "Desistiu",
  encerrar_sem_aceite: "Prazo encerrado",
} as const

export type AcaoPedido = keyof typeof atualizacoes | keyof typeof desfechos | "chamar" | "reabrir" | "desfazer" | "confirmar_envio"
export type ResultadoAcao = { ok: true; urlWhatsApp?: string; reservaId?: string } | {
  ok: false
  motivo: "sem_convite" | "acesso" | "acao_invalida" | "pedido_alterado" | "indisponivel"
}

export async function executarVistoria(acesso: Acesso, id: string, acao: AcaoPedido, reservaId?: string): Promise<ResultadoAcao> {
  if (acesso.tipo !== "operador" || acesso.perfil !== "operacao") return { ok: false, motivo: "acesso" }
  if (typeof id !== "string" || !/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n
    || typeof acao !== "string") {
    return { ok: false, motivo: "acao_invalida" }
  }

  const vinculo = `p.id = $1 and p.comunidade = $2 and p.encerrado_em is null
    and o.comunidade = p.comunidade and o.usuario_id = $3 and o.perfil = 'operacao'`
  const parametros = [id, acesso.comunidade, acesso.usuarioId]
  if (acao === "confirmar_entrada" || acao === "desistir" || acao === "encerrar_sem_aceite"
    || acao === "chamar" || acao === "reabrir" || acao === "desfazer" || acao === "confirmar_envio") {
    if (acao !== "chamar" && (typeof reservaId !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(reservaId))) {
      return { ok: false, motivo: "acao_invalida" }
    }
    if (acao === "confirmar_entrada" || acao === "desistir" || acao === "encerrar_sem_aceite") {
      const { rowCount } = await getPool().query(
        `update orbcommu.pedidos p set situacao = $5, encerrado_em = statement_timestamp(),
           encerrado_por = $3, encerrado_por_nome = $6 from orbcommu.operadores o
         where ${vinculo} and p.reserva_id = $4 and p.situacao = 'Convite enviado' and p.enviado_em is not null
           ${acao === "encerrar_sem_aceite" ? "and p.enviado_em + interval '24 hours' <= statement_timestamp()" : ""}`,
        [...parametros, reservaId, desfechos[acao], acesso.nomeExibicao ?? "Operador da equipe"],
      )
      return rowCount ? { ok: true } : { ok: false, motivo: "pedido_alterado" }
    }
    if (acao === "chamar" || acao === "reabrir") {
      const convite = await consultarConvite(acesso)
      if (!convite) return { ok: false, motivo: "sem_convite" }
      const consulta = acao === "chamar"
        ? `update orbcommu.pedidos p set reserva_id = coalesce(p.reserva_id, gen_random_uuid()), situacao = 'Chamada iniciada'
           from orbcommu.operadores o where ${vinculo} and p.situacao in ('Aguardando vaga','Chamada iniciada')
           returning p.reserva_id, p.telefone`
        : `select p.reserva_id, p.telefone from orbcommu.pedidos p, orbcommu.operadores o
           where ${vinculo} and p.situacao = 'Chamada iniciada' and p.reserva_id = $4`
      const { rows } = await getPool().query<{ reserva_id: string; telefone: string }>(consulta,
        acao === "chamar" ? parametros : [...parametros, reservaId])
      if (!rows.length) return { ok: false, motivo: "pedido_alterado" }
      return { ok: true, reservaId: rows[0].reserva_id, urlWhatsApp: conversaDeConvite(rows[0].telefone, convite) }
    }
    const desfazer = acao === "desfazer"
    const alteracao = desfazer
      ? "reserva_id = null, situacao = 'Aguardando vaga'"
      : `situacao = 'Convite enviado', enviado_em = coalesce(enviado_em, statement_timestamp()),
         enviado_por = case when enviado_em is null then $3::uuid else enviado_por end,
         enviado_por_nome = case when enviado_em is null then $5 else enviado_por_nome end`
    const situacoes = desfazer ? "('Chamada iniciada')" : "('Chamada iniciada','Convite enviado')"
    const valores = [...parametros, reservaId]
    if (!desfazer) valores.push(acesso.nomeExibicao ?? "Operador da equipe")
    const { rowCount } = await getPool().query(
      `update orbcommu.pedidos p set ${alteracao} from orbcommu.operadores o
       where ${vinculo} and p.reserva_id = $4 and p.situacao in ${situacoes}`, valores)
    return rowCount ? { ok: true } : { ok: false, motivo: "pedido_alterado" }
  }
  if (!Object.hasOwn(atualizacoes, acao)) return { ok: false, motivo: "acao_invalida" }

  const { rows } = await getPool().query<{ telefone: string }>(
    `update orbcommu.pedidos p set ${atualizacoes[acao]}
     from orbcommu.operadores o
     where ${vinculo} and p.situacao = 'Para analisar'
     returning p.telefone`,
    [id, acesso.comunidade, acesso.usuarioId, acesso.nomeExibicao ?? "Operador da equipe"],
  )
  if (!rows.length) return { ok: false, motivo: "pedido_alterado" }
  return acao === "conversar" ? { ok: true, urlWhatsApp: "https://wa.me/" + rows[0].telefone } : { ok: true }
}
