import { afterAll, expect, it as base, vi } from "vitest"
import { POST } from "../../app/api/demonstracao/route"
import { getPool } from "../../lib/db"
import type { Inscricao } from "../../lib/demonstracao"
import { banco } from "../support/banco"
import { usarCasoDemonstracao, type CasoDemonstracao } from "../support/demonstracao"

vi.mock("server-only", () => ({}))

const it = base.extend<{ caso: CasoDemonstracao }>({ caso: async ({}, usar) => usarCasoDemonstracao(usar) })
afterAll(async () => { await Promise.all([banco.end(), getPool().end()]) })

async function enviar(inscricao: Inscricao) {
  const resposta = await POST(new Request("http://localhost/api/demonstracao", {
    method: "POST",
    body: JSON.stringify(inscricao),
  }))
  expect(resposta.status).toBe(200)
  expect(await resposta.json()).toEqual({ recebido: true })
}

it("dois primeiros envios concorrentes ocupam uma posição", async ({ caso }) => {
  const inscricao: Inscricao = { canal: "email", contato: caso.email, interesse: "demonstracao" }
  await Promise.all([enviar(inscricao), enviar({ ...inscricao, contato: caso.email.toUpperCase() })])
  const linhasAposConcorrencia = await caso.linhas()
  expect(linhasAposConcorrencia).toEqual([{
    ...inscricao,
    id: expect.stringMatching(/^[1-9]\d*$/),
    recebido_em: expect.any(Date),
  }])

  await enviar({ ...inscricao, interesse: "edicao" })
  expect(await caso.linhas()).toEqual(linhasAposConcorrencia)
})

it("grava o WhatsApp apenas na fila de demonstração", async ({ caso }) => {
  const inscricao: Inscricao = { canal: "whatsapp", contato: caso.telefone, interesse: "edicao" }
  await enviar(inscricao)
  expect(await caso.linhas()).toEqual([expect.objectContaining(inscricao)])
  const { rows } = await banco.query("select id from orbcommu.pedidos where telefone = $1", [caso.telefone])
  expect(rows).toEqual([])
})

it("restringe a leitura direta aos papéis da API", async () => {
  const { rows } = await banco.query(
    "select has_table_privilege(role, 'orbcommu.inscricoes_demonstracao', 'SELECT') as permitido from unnest(array['anon', 'authenticated']) role",
  )
  expect(rows.map(row => row.permitido)).toEqual([false, false])
})
