"use server"

import { obterAcesso } from "@/lib/acesso"
import { criarDivulgacao, encerrarDivulgacao } from "@/lib/divulgacoes"
import { diaValido, hojeEmSaoPaulo, uuidValido } from "@/lib/periodo-divulgacao"
import { revalidatePath } from "next/cache"

export async function criar(id: string, nome: string, inicio: string, fim: string) {
  const acesso = await obterAcesso()
  if (acesso.tipo !== "operador" || acesso.perfil !== "operacao") return "Seu acesso permite apenas consultar."
  if (typeof nome !== "string" || !nome.trim() || nome.trim().length > 100) return "Informe um nome de até 100 caracteres."
  if (!uuidValido(id) || !diaValido(inicio) || !diaValido(fim) || inicio < hojeEmSaoPaulo() || fim < inicio)
    return "Escolha um período a partir de hoje."
  try {
    if (!await criarDivulgacao(acesso.comunidade, id, nome.trim(), inicio, fim)) return "Confira o período e tente novamente."
  } catch { return "Não foi possível gerar a divulgação. Tente novamente." }
  revalidatePath("/fila/divulgacoes")
  return null
}

export async function encerrar(id: string) {
  const acesso = await obterAcesso()
  if (acesso.tipo !== "operador" || acesso.perfil !== "operacao") return false
  try {
    if (!await encerrarDivulgacao(acesso.comunidade, id)) return false
  } catch { return false }
  revalidatePath("/fila/divulgacoes")
  revalidatePath(`/fila/divulgacoes/${id}`)
  return true
}
