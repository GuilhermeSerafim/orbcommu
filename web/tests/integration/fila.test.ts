import { randomUUID } from "node:crypto"
import { afterAll, expect, it, vi } from "vitest"
import { banco } from "../support/banco"
import { listarPedidos, type FiltroFila } from "../../lib/fila"
import { getPool } from "../../lib/db"

vi.mock("server-only", () => ({}))
const comunidade = randomUUID()
const outra = randomUUID()
const operador = { tipo: "operador", perfil: "leitura", usuarioId: randomUUID(), comunidade } as const
const filtro: FiltroFila = { busca: "", situacao: "Todos", pagina: 1, tamanho: 5 }

afterAll(async () => {
  await banco.query("delete from orbcommu.pedidos where comunidade = any($1)", [[comunidade, outra]])
  await Promise.all([banco.end(), getPool().end()])
})

it("desempata a chegada entre páginas", async () => {
  const ids: string[] = []
  for (let i = 0; i < 7; i++) {
    const instante = new Date(Date.UTC(2026, 0, Math.min(i + 1, 5)))
    const { rows } = await banco.query(
      `insert into orbcommu.pedidos(comunidade, nome, telefone, origem, situacao, recebido_em)
       values ($1,$2,$3,'Link geral','Para analisar',$4) returning id`,
      [i === 6 ? outra : comunidade, i >= 5 ? "Ana_% Silva" : "Bia", String(11000 + i), instante],
    )
    if (i < 6) ids.push(rows[0].id)
  }
  const p1 = await listarPedidos(operador, filtro)
  const p2 = await listarPedidos(operador, { ...filtro, pagina: 2 })
  expect([...p1.itens, ...p2.itens].map(p => p.id)).toEqual(ids)
  expect(p1.total).toBe(6)
  for (const busca of ["aNA_%", "_%", "(11) 005"]) {
    const resultado = await listarPedidos(operador, { ...filtro, busca, situacao: "Para analisar" })
    expect(resultado.total).toBe(1)
    expect(resultado.itens.map(p => p.id)).toEqual(ids.slice(-1))
    expect(resultado.itens[0]).toMatchObject({ nome: "Ana_% Silva", motivacao: null, telefone: "11005",
      origem: "Link geral", situacao: "Para analisar" })
    expect(Date.parse(resultado.itens[0].recebidoEm)).toBe(Date.UTC(2026, 0, 5))
  }
})
