"use server"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { clienteAuth } from "../../lib/cliente-auth"
import { obterAcesso } from "../../lib/acesso"
import { getPool } from "../../lib/db"

async function clienteDaAcao() {
  const jar = await cookies()
  return clienteAuth({
    getAll: () => jar.getAll(),
    setAll(atualizados) {
      for (const { name, value, options } of atualizados) jar.set(name, value, options)
    },
  })
}

export async function entrar(dados: FormData): Promise<void> {
  const email = dados.get("email")
  const senha = dados.get("senha")
  if (typeof email !== "string" || typeof senha !== "string") redirect("/entrar?erro=1")
  const { auth } = await clienteDaAcao()
  const { error } = await auth.signInWithPassword({ email: email.trim(), password: senha })
  if (error) redirect("/entrar?erro=1")
  redirect("/fila")
}

export async function sair(): Promise<void> {
  const { auth } = await clienteDaAcao()
  const { error } = await auth.signOut({ scope: "local" })
  if (error) throw new Error("Não foi possível encerrar a sessão.")
  redirect("/entrar")
}

export async function definirSenha(dados: FormData): Promise<void> {
  const acesso = await obterAcesso()
  if (acesso.tipo === "anonimo") redirect("/entrar")
  if (acesso.tipo !== "definir_senha") redirect("/fila")
  const rota = "/entrar/definir-senha"
  const senha = dados.get("senha")
  if (typeof senha !== "string" || senha.length < 12 || Buffer.byteLength(senha) > 72) redirect(rota + "?erro=tamanho")
  if (senha !== dados.get("confirmacao")) redirect(rota + "?erro=confirmacao")
  const { auth } = await clienteDaAcao()
  const conexao = await getPool().connect()
  let erro = ""
  try {
    await conexao.query("begin")
    const { rows } = await conexao.query(
      "select versao_senha_aceita from orbcommu.operadores where comunidade=$1 and usuario_id=$2 for update",
      [acesso.comunidade, acesso.usuarioId],
    )
    if (!rows.length) throw new Error("Vínculo indisponível")
    if (rows[0].versao_senha_aceita !== acesso.versao) {
      const { error } = await auth.updateUser({ password: senha })
      if (error) erro = error.code === "same_password" ? "repetida" : "alteracao"
      else await conexao.query(
        "update orbcommu.operadores set versao_senha_aceita=$3 where comunidade=$1 and usuario_id=$2",
        [acesso.comunidade, acesso.usuarioId, acesso.versao],
      )
    }
    await conexao.query("commit")
  } catch {
    await conexao.query("rollback")
    erro = "alteracao"
  } finally { conexao.release() }
  if (erro) redirect(rota + "?erro=" + erro)
  redirect("/fila")
}
