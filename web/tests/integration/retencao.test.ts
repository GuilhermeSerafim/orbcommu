import { randomUUID } from "node:crypto"
import type { PoolClient } from "pg"
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest"
import { banco } from "../support/banco"
import { listarPedidos, type FiltroFila } from "../../lib/fila"

vi.mock("server-only", () => ({}))
vi.mock("../../lib/db", () => ({ getPool: () => cliente }))
let cliente: PoolClient
const comunidade = randomUUID()
const operador = { tipo: "operador", perfil: "leitura", usuarioId: randomUUID(), comunidade } as const
const filtro: FiltroFila = { busca: "", situacao: "Todos", pagina: 1, tamanho: 5 }

beforeEach(async () => {
  cliente = await banco.connect()
  await cliente.query("begin")
  await cliente.query(`insert into orbcommu.pedidos
    (comunidade,nome,telefone,origem,situacao,recebido_em,encerrado_em,aprovado_por,aprovado_por_nome)
    values ($1,'Antigo','111','Link geral','Prazo encerrado',now()-interval '100 days',now()-interval '2160 hours',$2,'Cris'),
           ($1,'Recente','222','Link geral','Prazo encerrado',now()-interval '95 days',now()-interval '2136 hours',$2,'Cris'),
           ($1,'Ativo','111','Link geral','Aguardando vaga',now()-interval '91 days',null,$2,'Cris')`,
    [comunidade, operador.usuarioId])
})
afterEach(async () => {
  await cliente.query("rollback")
  cliente.release()
})
afterAll(() => banco.end())

it("exclui no instante exato de 90 dias antes da busca, da contagem e da paginação", async () => {
  const todos = await listarPedidos(operador, filtro)
  expect(todos.itens.map(p => p.nome)).toEqual(["Recente", "Ativo"])
  expect(todos.total).toBe(2)
  for (const situacao of ["Finalizados", "Prazo encerrado"] as const) {
    const pagina = await listarPedidos(operador, { ...filtro, situacao })
    expect(pagina.total).toBe(1)
    expect(pagina.atualizarEmMs).toBe(86_400_000)
  }
  expect((await listarPedidos(operador, { ...filtro, busca: "Antigo" })).total).toBe(0)
  expect((await listarPedidos(operador, { ...filtro, busca: "111" })).total).toBe(1)
  expect((await listarPedidos(operador, { ...filtro, pagina: 2 })).itens).toEqual([])
})

it("limpa apenas os vencidos da fixture e preserva a nova inscrição e sua autoria", async () => {
  const contar = async () => (await cliente.query("select count(*)::int as n from orbcommu.pedidos where comunidade=$1", [comunidade])).rows[0].n
  expect(await contar()).toBe(3)
  for (const esperado of [1, 0]) {
    const { rows } = await cliente.query("select orbcommu.limpar_pedidos_vencidos($1) as n", [comunidade])
    expect(rows[0].n).toBe(esperado)
  }
  expect(await contar()).toBe(2)
  const { itens } = await listarPedidos(operador, filtro)
  expect(itens[1]).toMatchObject({ nome: "Ativo", telefone: "111", aprovadoPor: operador.usuarioId, aprovadoPorNome: "Cris" })
})

it("mantém um único job ativo com limpeza restrita ao papel de manutenção", async () => {
  const { rows } = await cliente.query("select command, active from cron.job where jobname='orbcommu-retencao'")
  expect(rows).toHaveLength(1)
  expect(rows[0].active).toBe(true)
  expect(rows[0].command).toContain("set local role orbcommu_retencao")
  const privilegios = await cliente.query(`select rolname from pg_roles where rolname in ('anon','authenticated','orbcommu_web')
    and (has_function_privilege(rolname,'orbcommu.limpar_pedidos_vencidos(text)','execute')
      or has_table_privilege(rolname,'orbcommu.pedidos','delete'))`)
  expect(privilegios.rows).toEqual([])
})
