"use server"

import { obterAcesso } from "@/lib/acesso"
import { gerarSenhaTemporaria } from "@/lib/equipe"
import { uuidValido } from "@/lib/periodo-divulgacao"

export async function redefinir(id: string): Promise<{ senha: string } | { erro: string }> {
  const acesso = await obterAcesso()
  if (acesso.tipo !== "operador" || !acesso.superadmin || typeof id !== "string" || !uuidValido(id)) {
    return { erro: "Acesso recusado." }
  }
  try {
    const senha = await gerarSenhaTemporaria(acesso, id)
    return senha ? { senha } : { erro: "Conta indisponível." }
  } catch { return { erro: "Não foi possível redefinir a senha. Tente novamente." } }
}
