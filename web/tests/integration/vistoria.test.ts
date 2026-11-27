import { randomUUID } from "node:crypto"
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest"
import { banco } from "../support/banco"
import { criarOperadores } from "../support/operadores"
import { criarCasoPedido, type CasoPedido } from "../support/pedidos"
import { registrarPedido } from "../../lib/pedidos"
import { getPool } from "../../lib/db"
import { listarPedidos } from "../../lib/fila"
import { agirNoPedido, salvarConvite } from "../../app/fila/acoes"
import { consultarConvite } from "../../lib/configuracao-convite"
import type { Acesso } from "../../lib/acesso"

vi.mock("server-only", () => ({}))
const { obterAcesso } = vi.hoisted(() => ({ obterAcesso: vi.fn<() => Promise<Acesso>>() }))
vi.mock("../../lib/acesso", () => ({ obterAcesso }))

const comunidade = "meet-up-tech-sp"
const outra = randomUUID()
let contas: Awaited<ReturnType<typeof criarOperadores>>
const casos: CasoPedido[] = []

function acesso(usuarioId: string, perfil: "operacao" | "leitura" = "operacao", grupo = comunidade) {
  return { tipo: "operador", usuarioId, perfil, comunidade: grupo } as const
}

async function semear() {
  const caso = criarCasoPedido()
  casos.push(caso)
  await registrarPedido(caso.pedido)
  const [pedido] = await caso.linhas()
  return { caso, id: pedido.id as string }
}

beforeAll(async () => { contas = await criarOperadores() })
afterEach(async () => { await Promise.all(casos.splice(0).map(caso => caso.limpar())) })
afterAll(async () => {
  await contas?.limpar()
  await Promise.all([banco.end(), getPool().end()])
})

it("aprovar preserva a chegada", async () => {
  const operadora = acesso(contas.primeira.id)
  obterAcesso.mockResolvedValue(operadora)
  const { caso, id } = await semear()
  const filtro = { busca: caso.pedido.nome, pagina: 1, tamanho: 5, situacao: "Todos" } as const
  const [antes] = (await listarPedidos(operadora, filtro)).itens
  expect(await agirNoPedido(id, "aprovar")).toEqual({ ok: true })
  const [depois] = (await listarPedidos(operadora, filtro)).itens
  expect(depois.recebidoEm).toEqual(antes.recebidoEm)
  expect(depois).toMatchObject({ situacao: "Aguardando vaga", aprovadoPor: operadora.usuarioId })
})

it("conversar registra autor e horário e conserva a situação", async () => {
  obterAcesso.mockResolvedValue(acesso(contas.segunda.id))
  const { caso, id } = await semear()
  expect(await agirNoPedido(id, "conversar")).toEqual({ ok: true, urlWhatsApp: "https://wa.me/" + caso.pedido.telefone })
  const [pedido] = await caso.linhas()
  expect(pedido).toMatchObject({ situacao: "Para analisar", conversado_por: contas.segunda.id })
  expect(pedido.conversado_em).toBeInstanceOf(Date)
})

it("encerrar a vistoria libera o número", async () => {
  obterAcesso.mockResolvedValue(acesso(contas.primeira.id))
  const { caso, id } = await semear()
  expect(await agirNoPedido(id, "encerrar")).toEqual({ ok: true })
  await registrarPedido({ ...caso.pedido, nome: caso.outroNome })
  const linhas = await caso.linhas()
  expect(linhas).toHaveLength(2)
  expect(linhas[0]).toMatchObject({ situacao: "Encerrado na vistoria", encerrado_por: contas.primeira.id })
  expect(linhas[0].encerrado_em).toBeInstanceOf(Date)
  expect(linhas[1]).toMatchObject({ situacao: "Para analisar", encerrado_em: null })
})

it("leitura não escreve, inclusive se o perfil mudar depois da consulta", async () => {
  const { caso, id } = await semear()
  for (const perfil of ["leitura", "operacao"] as const) {
    obterAcesso.mockResolvedValue(acesso(contas.leitora.id, perfil))
    for (const acao of ["aprovar", "conversar", "encerrar"] as const) {
      expect(await agirNoPedido(id, acao)).toMatchObject({ ok: false })
    }
  }
  expect((await caso.linhas())[0]).toMatchObject({ situacao: "Para analisar", conversado_em: null })
})

it("um vínculo de operação em outra comunidade não altera o pedido", async () => {
  const { caso, id } = await semear()
  await banco.query("insert into orbcommu.operadores (comunidade, usuario_id, perfil) values ($1, $2, 'operacao')", [outra, contas.semVinculo.id])
  obterAcesso.mockResolvedValue(acesso(contas.semVinculo.id, "operacao", outra))
  expect(await agirNoPedido(id, "aprovar")).toMatchObject({ ok: false })
  expect((await caso.linhas())[0].situacao).toBe("Para analisar")
})

it("aprovação e encerramento simultâneos têm um único vencedor", async () => {
  const { caso, id } = await semear()
  obterAcesso.mockResolvedValueOnce(acesso(contas.primeira.id)).mockResolvedValueOnce(acesso(contas.segunda.id))
  const resultados = await Promise.all([agirNoPedido(id, "aprovar"), agirNoPedido(id, "encerrar")])
  expect(resultados.filter(resultado => resultado.ok)).toHaveLength(1)
  const [pedido] = await caso.linhas()
  if (resultados[0].ok) {
    expect(pedido).toMatchObject({ situacao: "Aguardando vaga", aprovado_por: contas.primeira.id, encerrado_em: null })
  } else {
    expect(pedido).toMatchObject({ situacao: "Encerrado na vistoria", encerrado_por: contas.segunda.id, aprovado_em: null })
  }
})

it("o convite exige vínculo operacional e preserva o valor salvo após uma entrada inválida", async () => {
  const grupo = randomUUID()
  const operadora = acesso(contas.primeira.id, "operacao", grupo)
  const leitora = acesso(contas.leitora.id, "leitura", grupo)
  const convite = "https://chat.whatsapp.com/FixtureAb123"

  await banco.query("insert into orbcommu.operadores (comunidade, usuario_id, perfil) values ($1, $2, 'operacao'), ($1, $3, 'leitura')", [grupo, operadora.usuarioId, leitora.usuarioId])
  try {
    obterAcesso.mockResolvedValue(operadora)
    expect(await salvarConvite(convite + "?mode=ac_t")).toEqual({ ok: true, convite })
    expect(await salvarConvite("https://example.test")).toEqual({ ok: false, motivo: "link_invalido" })

    obterAcesso.mockResolvedValue(leitora)
    expect(await salvarConvite(convite + "Outro")).toEqual({ ok: false, motivo: "acesso" })
    expect(await consultarConvite(leitora)).toBeNull()

    const perfilDesatualizado = { ...leitora, perfil: "operacao" } as const
    obterAcesso.mockResolvedValue(perfilDesatualizado)
    expect(await salvarConvite(convite + "Outro")).toEqual({ ok: false, motivo: "acesso" })
    expect(await consultarConvite(perfilDesatualizado)).toBeNull()
    expect(await consultarConvite(operadora)).toBe(convite)

    obterAcesso.mockResolvedValue(operadora)
    expect(await salvarConvite(convite + "Novo")).toEqual({ ok: true, convite: convite + "Novo" })
    expect(await consultarConvite(operadora)).toBe(convite + "Novo")
  } finally {
    await banco.query("delete from orbcommu.convites_do_grupo where comunidade = $1", [grupo])
  }
})
