"use server"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { clienteAuth } from "../../lib/cliente-auth"

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
