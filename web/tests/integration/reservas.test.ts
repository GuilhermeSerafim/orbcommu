import { randomUUID } from "node:crypto"
import { afterAll, beforeAll, expect, it, vi } from "vitest"
import { banco } from "../support/banco"
import { criarOperadores } from "../support/operadores"
import { listarPedidos } from "../../lib/fila"
import { executarVistoria } from "../../lib/operacao"
import { getPool } from "../../lib/db"

vi.mock("server-only", () => ({}))
const comunidade = randomUUID()
let contas: Awaited<ReturnType<typeof criarOperadores>>
const operadora = (id: string) => ({ tipo: "operador", perfil: "operacao", usuarioId: id, comunidade, nomeExibicao: "Equipe" } as const)
async function pedido() {
  return (await banco.query("insert into orbcommu.pedidos (comunidade,nome,telefone,origem,situacao) values ($1,'Ana',$2,'Link geral','Aguardando vaga') returning id", [comunidade, randomUUID()])).rows[0].id as string
}

async function chamar(id: string, conta = contas.primeira.id) {
  const resultado = await executarVistoria(operadora(conta), id, "chamar")
  expect(resultado).toMatchObject({ ok: true, reservaId: expect.any(String) })
  if (!resultado.ok || !resultado.reservaId) throw Error("Reserva ausente")
  return resultado.reservaId
}
beforeAll(async () => {
  contas = await criarOperadores()
  await banco.query("insert into orbcommu.operadores (comunidade,usuario_id,perfil) values ($1,$2,'operacao'),($1,$3,'operacao')", [comunidade, contas.primeira.id, contas.segunda.id])
})
afterAll(async () => {
  await banco.query("delete from orbcommu.pedidos where comunidade=$1", [comunidade])
  await banco.query("delete from orbcommu.convites_do_grupo where comunidade=$1", [comunidade])
  await contas?.limpar()
  await Promise.all([banco.end(), getPool().end()])
})

it("sem link Ana mantém a vez", async () => {
  await banco.query("delete from orbcommu.convites_do_grupo where comunidade=$1", [comunidade])
  const id = await pedido()
  expect(await executarVistoria(operadora(contas.primeira.id), id, "chamar")).toEqual({ ok: false, motivo: "sem_convite" })
  expect((await banco.query("select situacao from orbcommu.pedidos where id=$1", [id])).rows[0].situacao).toBe("Aguardando vaga")
})
async function configurar() {
  await banco.query("insert into orbcommu.convites_do_grupo values ($1,'https://chat.whatsapp.com/Fixture123') on conflict do nothing", [comunidade])
}
it("duas chamadas concorrentes usam a mesma reserva", async () => {
  await configurar()
  const id = await pedido()
  const [joana, cris] = await Promise.all([chamar(id), chamar(id, contas.segunda.id)])
  expect(joana).toBe(cris)
  expect(await chamar(await pedido())).not.toBe(cris)
})

it("confirmar novamente mantém autoria e instante originais", async () => {
  await configurar()
  const id = await pedido()
  const reserva = await chamar(id)
  const envio = async () => (await banco.query("select enviado_em, enviado_por from orbcommu.pedidos where id=$1", [id])).rows[0]
  expect(await executarVistoria(operadora(contas.primeira.id), id, "confirmar_envio", reserva)).toMatchObject({ ok: true })
  const antes = await envio()
  expect(antes).toMatchObject({ enviado_em: expect.any(Date), enviado_por: contas.primeira.id })
  expect(await executarVistoria(operadora(contas.segunda.id), id, "confirmar_envio", reserva)).toMatchObject({ ok: true })
  expect(await envio()).toEqual(antes)
})

it("confirmação antiga não altera a nova reserva", async () => {
  await configurar()
  const id = await pedido()
  const anterior = await chamar(id)
  const acesso = operadora(contas.primeira.id)
  expect(await executarVistoria(acesso, id, "desfazer", anterior)).toMatchObject({ ok: true })
  const nova = await chamar(id)
  expect(nova).not.toBe(anterior)
  for (const acao of ["reabrir", "desfazer", "confirmar_envio"] as const) {
    expect(await executarVistoria(acesso, id, acao, anterior)).toEqual({ ok: false, motivo: "pedido_alterado" })
  }
})
it("deriva a conferência no prazo do envio e só encerra pela reserva atual", async () => {
  const acesso = operadora(contas.segunda.id)
  const ids: string[] = []
  for (const idade of ["23 hours 59 minutes", "24 hours", "25 hours"]) {
    const id = await pedido()
    ids.push(id)
    await banco.query("update orbcommu.pedidos set situacao='Convite enviado', reserva_id=gen_random_uuid(), enviado_em=statement_timestamp()-$2::interval, nome='Conferencia' where id=$1", [id, idade])
  }
  const filtro = { busca: "Conferencia", pagina: 1, tamanho: 5 } as const
  const todos = await listarPedidos(acesso, { ...filtro, situacao: "Todos" })
  expect(todos.itens.map(item => item.situacao)).toEqual(["Convite enviado", "A conferir", "A conferir"])
  const conferir = await listarPedidos(acesso, { ...filtro, situacao: "A conferir" })
  expect(conferir.total).toBe(2)
  expect(conferir.itens.every(item => item.reservaId && !item.encerradoEm)).toBe(true)
  for (const acao of ["confirmar_entrada", "desistir", "encerrar_sem_aceite"] as const) {
    expect(await executarVistoria(acesso, ids[1], acao, randomUUID())).toEqual({ ok: false, motivo: "pedido_alterado" })
  }
  const agir = (i: number, acao: "confirmar_entrada" | "desistir" | "encerrar_sem_aceite") =>
    executarVistoria(acesso, ids[i], acao, todos.itens[i].reservaId!)
  expect((await agir(0, "encerrar_sem_aceite")).ok).toBe(false)
  expect((await agir(0, "desistir")).ok).toBe(true)
  expect((await agir(1, "confirmar_entrada")).ok).toBe(true)
  const respostas = await Promise.all([agir(2, "encerrar_sem_aceite"), agir(2, "confirmar_entrada")])
  expect(respostas.filter(r => r.ok)).toHaveLength(1)
  const finais = await listarPedidos(acesso, { ...filtro, situacao: "Finalizados" })
  expect(finais.total).toBe(3)
  expect(finais.itens.map(item => item.situacao).slice(0, 2)).toEqual(["Desistiu", "Entrada confirmada"])
})
