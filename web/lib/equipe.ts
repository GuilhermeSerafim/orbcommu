import "server-only"
import { randomBytes, randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import type { Acesso } from "./acesso"
import { getPool } from "./db"

type Administrador = Extract<Acesso, { tipo: "operador" }>

function authAdministrativo() {
  const chave = process.env.SUPABASE_ADMIN_KEY
  if (!chave) throw new Error("A administração de acessos está indisponível.")
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }).auth.admin
}

async function vinculosAdministraveis(acesso: Administrador, alvo?: string) {
  if (!acesso.superadmin) return []
  const { rows } = await getPool().query<{ id: string; superadmin: boolean }>(
    `select alvo.usuario_id as id, alvo.superadmin from orbcommu.operadores alvo
     join orbcommu.operadores gestor on gestor.comunidade=alvo.comunidade
     where gestor.usuario_id=$1 and gestor.comunidade=$2 and gestor.superadmin
       and ($3::uuid is null or alvo.usuario_id=$3) order by alvo.usuario_id`,
    [acesso.usuarioId, acesso.comunidade, alvo ?? null],
  )
  return rows
}

export async function listarEquipe(acesso: Administrador) {
  const vinculos = await vinculosAdministraveis(acesso)
  const auth = authAdministrativo()
  return Promise.all(vinculos.map(async ({ id, superadmin }) => {
    const { data, error } = await auth.getUserById(id)
    if (error || !data.user?.email) throw new Error("Não foi possível consultar a equipe.")
    return { id, email: data.user.email, superadmin }
  }))
}

export async function gerarSenhaTemporaria(acesso: Administrador, id: string) {
  if (!(await vinculosAdministraveis(acesso, id)).length) return null
  const senha = randomBytes(18).toString("base64url") + "aA1!"
  const { error } = await authAdministrativo().updateUserById(id, {
    password: senha,
    app_metadata: { versao_senha: randomUUID(), senha_reiniciada_em: new Date().toISOString() },
  })
  if (error) throw new Error("Não foi possível redefinir a senha.")
  return senha
}
