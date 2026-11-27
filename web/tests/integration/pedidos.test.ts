import { afterAll, expect, it as base, vi } from "vitest"
import { banco } from "../support/banco"
import { usarCasoPedido, type CasoPedido } from "../support/pedidos"
import { COMUNIDADE, registrarPedido } from "../../lib/pedidos"
import { getPool } from "../../lib/db"

vi.mock("server-only", () => ({}))

const it = base.extend<{ caso: CasoPedido }>({ caso: async ({}, usar) => usarCasoPedido(usar) })
afterAll(async () => { await Promise.all([banco.end(), getPool().end()]) })

it("grava a primeira inscrição", async ({ caso }) => {
  await registrarPedido(caso.pedido)
  const relationName = (await banco.query("select to_regclass('orbcommu.pedidos')::text as nome")).rows[0].nome
  expect(relationName).toBe("orbcommu.pedidos")
  const pedidos = await caso.linhas()
  expect(pedidos).toHaveLength(1)
  expect(pedidos[0]).toMatchObject({
    ...caso.pedido, comunidade: COMUNIDADE, origem: "Link geral", situacao: "Para analisar",
    encerrado_em: null, recebido_em: expect.any(Date), id: expect.stringMatching(/^[1-9]\d*$/),
  })
})

it("preserva o primeiro pedido no reenvio", async ({ caso }) => {
  await registrarPedido(caso.pedido)
  const antes = await caso.linhas()
  expect(antes).toEqual([expect.objectContaining(caso.pedido)])
  await registrarPedido({ ...caso.pedido, nome: caso.outroNome, motivacao: "Outro encontro" })
  expect(await caso.linhas()).toEqual(antes)
})

it("preserva um único pedido sob concorrência", async ({ caso }) => {
  const pedidos = [
    { ...caso.pedido, motivacao: "Primeiro envio" },
    { ...caso.pedido, nome: caso.outroNome, motivacao: "Segundo envio" },
  ]
  const resultados = await Promise.allSettled(pedidos.map(registrarPedido))
  expect(resultados.map(r => r.status)).toEqual(["fulfilled", "fulfilled"])
  const salvas = await caso.linhas()
  expect(salvas).toHaveLength(1)
  const { nome, motivacao, telefone } = salvas[0]
  expect(pedidos).toContainEqual({ nome, motivacao, telefone })
})

it("permite novo pedido depois do encerramento individual", async ({ caso }) => {
  await registrarPedido(caso.pedido)
  await caso.encerrar()
  await registrarPedido(caso.pedido)
  const pedidos = await caso.linhas()
  expect(pedidos).toHaveLength(2)
  expect(pedidos[0].encerrado_em).toBeInstanceOf(Date)
  expect(pedidos[1].encerrado_em).toBeNull()
})

it("restringe a leitura direta para os papéis da API", async () => {
  const { rows } = await banco.query(`
    select has_table_privilege(role, 'orbcommu.pedidos', 'SELECT') as permitido
    from unnest(array['anon', 'authenticated']) role
  `)
  expect(rows.map(r => r.permitido)).toEqual([false, false])
})
