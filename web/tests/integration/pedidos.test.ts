import { afterAll, afterEach, expect, it, vi } from "vitest"
import { banco } from "../support/banco"
import { COMUNIDADE, registrarPedido } from "../../lib/pedidos"
import { getPool } from "../../lib/db"

vi.mock("server-only", () => ({}))

const ana = { nome: "Ana", telefone: "5511912345678", motivacao: null }
const filtro = [COMUNIDADE, ana.telefone]
const linhas = async () => (await banco.query(
  "select * from orbcommu.pedidos where comunidade = $1 and telefone = $2 order by id", filtro,
)).rows
afterEach(async () => {
  if ((await banco.query("select to_regclass('orbcommu.pedidos') as nome")).rows[0].nome) {
    await banco.query("delete from orbcommu.pedidos where comunidade = $1 and telefone = $2", filtro)
  }
})
afterAll(async () => { await Promise.all([banco.end(), getPool().end()]) })

it("grava a primeira inscrição", async () => {
  await registrarPedido(ana)
  const relationName = (await banco.query("select to_regclass('orbcommu.pedidos')::text as nome")).rows[0].nome
  expect(relationName).toBe("orbcommu.pedidos")
  const pedidos = await linhas()
  expect(pedidos).toHaveLength(1)
  expect(pedidos[0]).toMatchObject({
    ...ana, comunidade: COMUNIDADE, origem: "Link geral", situacao: "Para analisar",
    encerrado_em: null, recebido_em: expect.any(Date), id: expect.stringMatching(/^[1-9]\d*$/),
  })
})

it("preserva o primeiro pedido no reenvio", async () => {
  await registrarPedido(ana)
  const antes = await linhas()
  await registrarPedido({ ...ana, nome: "Bea", motivacao: "Outro encontro" })
  expect(await linhas()).toEqual(antes)
})

it("preserva um único pedido sob concorrência", async () => {
  const pedidos = [
    { ...ana, motivacao: "Primeiro envio" },
    { ...ana, nome: "Bea", motivacao: "Segundo envio" },
  ]
  const resultados = await Promise.allSettled(pedidos.map(registrarPedido))
  expect(resultados.map(r => r.status)).toEqual(["fulfilled", "fulfilled"])
  const salvas = await linhas()
  expect(salvas).toHaveLength(1)
  const { nome, motivacao, telefone } = salvas[0]
  expect(pedidos).toContainEqual({ nome, motivacao, telefone })
})

it("permite novo pedido depois do encerramento individual", async () => {
  await registrarPedido(ana)
  await banco.query("update orbcommu.pedidos set encerrado_em = now() where comunidade = $1 and telefone = $2", filtro)
  await registrarPedido(ana)
  const pedidos = await linhas()
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
