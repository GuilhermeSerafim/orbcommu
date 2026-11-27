import { randomUUID } from "node:crypto"
import { afterAll, expect, it, vi } from "vitest"
import { registrarPedido } from "../../lib/pedidos"
import { getPool } from "../../lib/db"
import { banco } from "../support/banco"
import { criarCasoPedido } from "../support/pedidos"

vi.mock("server-only", () => ({}))
afterAll(async () => { await Promise.all([banco.end(), getPool().end()]) })

it("preserva um pedido ativo anterior do mesmo telefone quando a fixture tenta reenviar", async () => {
  const caso = criarCasoPedido()
  const { rows: [anterior] } = await banco.query(
    `insert into orbcommu.pedidos (comunidade, nome, telefone, origem, situacao)
     values ('meet-up-tech-sp', $1, $2, 'Link geral', 'Para analisar') returning *`,
    ["Pedido anterior " + randomUUID(), caso.pedido.telefone],
  )
  try {
    await registrarPedido(caso.pedido)
    expect(await caso.linhas()).toEqual([])
    await caso.encerrar()
    await caso.limpar()
    const { rows } = await banco.query("select * from orbcommu.pedidos where id = $1", [anterior.id])
    expect(rows).toEqual([anterior])
  } finally {
    await banco.query("delete from orbcommu.pedidos where id = $1", [anterior.id])
    await caso.limpar()
  }
})

it("preserva o histórico anterior do mesmo telefone ao encerrar e limpar a fixture", async () => {
  const caso = criarCasoPedido()
  const { rows: [historico] } = await banco.query(
    `insert into orbcommu.pedidos (comunidade, nome, telefone, origem, situacao, encerrado_em)
     values ('meet-up-tech-sp', $1, $2, 'Link geral', 'Para analisar', '2025-01-01T00:00:00Z') returning *`,
    ["Histórico " + randomUUID(), caso.pedido.telefone],
  )
  const lerHistorico = async () => (await banco.query(
    "select * from orbcommu.pedidos where id = $1", [historico.id],
  )).rows
  try {
    await registrarPedido(caso.pedido)
    expect((await caso.linhas()).map(linha => linha.nome)).toEqual([caso.pedido.nome])
    await caso.encerrar()
    expect(await lerHistorico()).toEqual([historico])
    await caso.limpar()
    expect(await caso.linhas()).toEqual([])
    expect(await lerHistorico()).toEqual([historico])
  } finally {
    await banco.query("delete from orbcommu.pedidos where id = $1", [historico.id])
    await caso.limpar()
  }
})
