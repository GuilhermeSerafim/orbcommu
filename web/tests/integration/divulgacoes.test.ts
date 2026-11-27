import { randomUUID } from "node:crypto"
import { afterAll, expect, it, vi } from "vitest"
import { banco } from "../support/banco"
import { getPool } from "../../lib/db"
import { criarDivulgacao, registrarAbertura, registrarPedidoDaDivulgacao, obterDivulgacao, encerrarDivulgacao, resultadoDivulgacao } from "../../lib/divulgacoes"
import { usarCasoPedido } from "../support/pedidos"

vi.mock("server-only", () => ({}))
afterAll(async () => { await Promise.all([banco.end(), getPool().end()]) })

it("respeita o calendário de São Paulo, a atribuição, os perfis de comunidade e a contagem de pessoas", async () => {
  const id = randomUUID()
  const outra = randomUUID()
  const comunidade = "meet-up-tech-sp"
  const { hoje, amanha } = (await banco.query(`select
    to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM-DD') hoje,
    to_char((now() at time zone 'America/Sao_Paulo') + interval '1 day','YYYY-MM-DD') amanha`)).rows[0]
  try {
    expect(await criarDivulgacao(comunidade, id, "Evento QA", hoje, hoje)).toBe(true)
    expect(await criarDivulgacao(comunidade, id, "Evento QA", hoje, hoje)).toBe(true)
    expect(await criarDivulgacao(comunidade, outra, "Próxima edição", amanha, amanha)).toBe(true)
    expect(await obterDivulgacao(comunidade, outra)).toMatchObject({ estado: "Agendada", inicio: amanha, fim: amanha })
    expect(await obterDivulgacao("outra-fila", id)).toBeNull()
    expect(await encerrarDivulgacao("outra-fila", id)).toBe(false)
    const visita = randomUUID()
    await registrarAbertura(comunidade, id, visita)
    await registrarAbertura(comunidade, id, visita)
    await registrarAbertura(comunidade, id, randomUUID())
    await usarCasoPedido(async caso => {
      expect(await registrarPedidoDaDivulgacao(comunidade, outra, caso.pedido)).toBe("agendada")
      expect(await registrarPedidoDaDivulgacao("outra-fila", id, caso.pedido)).toBe("invalida")
      await registrarPedidoDaDivulgacao(comunidade, id, caso.pedido)
      await registrarPedidoDaDivulgacao(comunidade, id, caso.pedido)
      expect(await encerrarDivulgacao(comunidade, id)).toBe(true)
      expect(await registrarPedidoDaDivulgacao(comunidade, id, caso.pedido)).toBe("encerrada")
      const [pedido] = await caso.linhas()
      await banco.query("update orbcommu.pedidos set encerrado_em = now(), situacao = 'Entrada confirmada' where id = $1", [pedido.id])
      expect(await resultadoDivulgacao(comunidade, id)).toMatchObject({
        aberturas: 2, dias: [{ dia: hoje, aberturas: 2 }], confirmados: 1, solicitantes: 1,
      })
    })
  } finally {
    await banco.query("delete from orbcommu.divulgacoes where id = any($1::uuid[])", [[id, outra]])
  }
})
