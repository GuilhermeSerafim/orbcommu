import "server-only"
import { cookies } from "next/headers"
import { clienteAuth } from "./cliente-auth"
import { getPool } from "./db"
import { COMUNIDADE } from "./pedidos"

export type Acesso =
  | { tipo: "anonimo" }
  | { tipo: "sem_vinculo" }
  | { tipo: "operador"; usuarioId: string; comunidade: string; perfil: "leitura" | "operacao" }

export async function obterAcesso(): Promise<Acesso> {
  const jar = await cookies()
  // O proxy persiste a renovação antes da renderização do componente.
  const { auth } = clienteAuth({ getAll: () => jar.getAll(), setAll: () => {} })
  const { data: { user }, error } = await auth.getUser()
  if (error || !user) return { tipo: "anonimo" }
  const vinculo = await getPool().query<{ perfil: "leitura" | "operacao" }>(
    "select perfil from orbcommu.operadores where comunidade = $1 and usuario_id = $2",
    [COMUNIDADE, user.id],
  )
  if (!vinculo.rowCount) return { tipo: "sem_vinculo" }
  return { tipo: "operador", usuarioId: user.id, comunidade: COMUNIDADE, perfil: vinculo.rows[0].perfil }
}
