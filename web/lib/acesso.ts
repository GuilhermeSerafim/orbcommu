import "server-only"
import { cookies } from "next/headers"
import { clienteAuth } from "./cliente-auth"
import { getPool } from "./db"
import { COMUNIDADE } from "./pedidos"

export type Acesso =
  | { tipo: "anonimo" }
  | { tipo: "sem_vinculo" }
  | { tipo: "definir_senha"; usuarioId: string; comunidade: string; versao: string }
  | { tipo: "operador"; usuarioId: string; comunidade: string; perfil: "leitura" | "operacao"; superadmin?: boolean; nomeExibicao?: string }

export async function obterAcesso(): Promise<Acesso> {
  const jar = await cookies()
  // O proxy persiste a renovação antes da renderização do componente.
  const { auth } = clienteAuth({ getAll: () => jar.getAll(), setAll: () => {} })
  const { data: { user }, error } = await auth.getUser()
  if (error || !user) return { tipo: "anonimo" }
  const vinculo = await getPool().query<{ perfil: "leitura" | "operacao"; superadmin: boolean; versao_senha_aceita: string | null }>(
    "select perfil, superadmin, versao_senha_aceita from orbcommu.operadores where comunidade = $1 and usuario_id = $2",
    [COMUNIDADE, user.id],
  )
  if (!vinculo.rowCount) return { tipo: "sem_vinculo" }
  const versao = user.app_metadata.versao_senha ?? "inicial"
  const desde = user.app_metadata.senha_reiniciada_em
  if (desde) {
    const { data } = await auth.getClaims()
    const sessao = data?.claims.session_id
    if (typeof sessao !== "string" || data?.claims.sub !== user.id) return { tipo: "anonimo" }
    const { rows } = await getPool().query(
      "select orbcommu.sessao_apos_redefinicao($1, $2, $3) as valida", [user.id, sessao, desde],
    )
    if (!rows[0]?.valida) return { tipo: "anonimo" }
  }
  if (vinculo.rows[0].versao_senha_aceita !== versao) {
    return { tipo: "definir_senha", usuarioId: user.id, comunidade: COMUNIDADE, versao }
  }
  const nome = user.app_metadata.nome_exibicao
  const nomeExibicao = typeof nome === "string" ? nome.trim() : undefined
  return { tipo: "operador", usuarioId: user.id, comunidade: COMUNIDADE, perfil: vinculo.rows[0].perfil, superadmin: vinculo.rows[0].superadmin, nomeExibicao: nomeExibicao || undefined }
}
