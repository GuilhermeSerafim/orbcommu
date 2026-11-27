import { cache } from "react"
import { redirect } from "next/navigation"
import { obterAcesso } from "@/lib/acesso"

export const acessoDivulgacoes = cache(async () => {
  const acesso = await obterAcesso()
  if (acesso.tipo === "anonimo") redirect("/entrar")
  if (acesso.tipo === "definir_senha") redirect("/entrar/definir-senha")
  if (acesso.tipo !== "operador") redirect("/fila")
  return acesso
})
