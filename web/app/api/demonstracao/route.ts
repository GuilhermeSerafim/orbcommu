import { receberInscricao } from "../../../lib/demonstracao"
import { registrarInscricao } from "../../../lib/inscricoes-demonstracao"

export function POST(requisicao: Request): Promise<Response> {
  return receberInscricao(requisicao, registrarInscricao)
}
