import { randomInt, randomUUID } from "node:crypto"
import { banco } from "./banco"

export function criarCasoDemonstracao() {
  const email = "demonstracao-" + randomUUID() + "@example.org"
  const telefone = "55119" + String(randomInt(100_000_000)).padStart(8, "0")
  const filtro = [email, telefone]
  const tabela = "orbcommu.inscricoes_demonstracao"
  const onde = "(canal = 'email' and contato = $1) or (canal = 'whatsapp' and contato = $2)"

  return {
    email,
    telefone,
    linhas: async () => (await banco.query("select * from " + tabela + " where " + onde + " order by id", filtro)).rows,
    limpar: async () => { await banco.query("delete from " + tabela + " where " + onde, filtro) },
  }
}

export type CasoDemonstracao = ReturnType<typeof criarCasoDemonstracao>

export async function usarCasoDemonstracao(usar: (caso: CasoDemonstracao) => Promise<void>) {
  const caso = criarCasoDemonstracao()
  try { await usar(caso) } finally { await caso.limpar() }
}
