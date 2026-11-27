"use server"

import { configurarConvite, type ResultadoConvite } from "../../lib/configuracao-convite"
import { obterAcesso } from "../../lib/acesso"
import { executarVistoria, type AcaoPedido, type ResultadoAcao } from "../../lib/operacao"

export async function agirNoPedido(id: string, acao: AcaoPedido, reservaId?: string): Promise<ResultadoAcao> {
  try {
    return await executarVistoria(await obterAcesso(), id, acao, reservaId)
  } catch {
    return { ok: false, motivo: "indisponivel" }
  }
}

export async function salvarConvite(valor: string): Promise<ResultadoConvite> {
  try {
    return await configurarConvite(await obterAcesso(), valor)
  } catch {
    return { ok: false, motivo: "indisponivel" }
  }
}
