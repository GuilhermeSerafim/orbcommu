import { randomInt, randomUUID } from "node:crypto"
import { banco } from "./banco"

export function criarCasoPedido() {
  const marcador = randomUUID()
  const nome = "Pessoa A " + marcador
  const outroNome = "Pessoa B " + marcador
  const telefone = "55119" + String(randomInt(100_000_000)).padStart(8, "0")
  const filtro = ["meet-up-tech-sp", telefone, [nome, outroNome]]
  const onde = "comunidade = $1 and telefone = $2 and nome = any($3::text[])"

  return {
    pedido: { nome, telefone, motivacao: null },
    outroNome,
    linhas: async () => (await banco.query(
      `select * from orbcommu.pedidos where ${onde} order by id`, filtro,
    )).rows,
    encerrar: async () => {
      await banco.query(`update orbcommu.pedidos set encerrado_em = now() where ${onde} and encerrado_em is null`, filtro)
    },
    limpar: async () => {
      await banco.query(`delete from orbcommu.pedidos where ${onde}`, filtro)
    },
  }
}

export type CasoPedido = ReturnType<typeof criarCasoPedido>

export async function usarCasoPedido(usar: (caso: CasoPedido) => Promise<void>) {
  const caso = criarCasoPedido()
  try { await usar(caso) } finally { await caso.limpar() }
}
