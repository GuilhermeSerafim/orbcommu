"use server"

import { obterAcesso } from "../../lib/acesso"
import { executarVistoria, type AcaoPedido, type ResultadoAcao } from "../../lib/operacao"

export async function agirNoPedido(id: string, acao: AcaoPedido, _reservaId?: string): Promise<ResultadoAcao> {
  try {
    return await executarVistoria(await obterAcesso(), id, acao)
  } catch {
    return { ok: false, motivo: "indisponivel" }
  }
}
