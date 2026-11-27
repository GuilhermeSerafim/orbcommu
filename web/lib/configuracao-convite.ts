import "server-only"
import type { Acesso } from "./acesso"
import { normalizarConvite } from "./convite"
import { getPool } from "./db"

export type ResultadoConvite = { ok: true; convite: string } | {
  ok: false
  motivo: "acesso" | "link_invalido" | "indisponivel"
}

export async function consultarConvite(acesso: Acesso): Promise<string | null> {
  if (acesso.tipo !== "operador" || acesso.perfil !== "operacao") return null
  const { rows } = await getPool().query<{ convite: string }>(
    `select c.convite
     from orbcommu.convites_do_grupo c
     join orbcommu.operadores o using (comunidade)
     where c.comunidade = $1 and o.usuario_id = $2 and o.perfil = 'operacao'`,
    [acesso.comunidade, acesso.usuarioId],
  )
  return rows[0]?.convite ?? null
}

export async function configurarConvite(acesso: Acesso, valor: string): Promise<ResultadoConvite> {
  if (acesso.tipo !== "operador" || acesso.perfil !== "operacao") return { ok: false, motivo: "acesso" }
  const convite = normalizarConvite(valor)
  if (!convite) return { ok: false, motivo: "link_invalido" }

  const { rowCount } = await getPool().query(
    `insert into orbcommu.convites_do_grupo (comunidade, convite)
     select comunidade, $3 from orbcommu.operadores
     where comunidade = $1 and usuario_id = $2 and perfil = 'operacao'
     on conflict (comunidade) do update set convite = excluded.convite`,
    [acesso.comunidade, acesso.usuarioId, convite],
  )
  return rowCount ? { ok: true, convite } : { ok: false, motivo: "acesso" }
}
