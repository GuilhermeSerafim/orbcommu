import { randomUUID } from "node:crypto"
import { afterAll, expect, it, vi } from "vitest"
import { GET } from "../../app/api/fila/resumo/route"
import { obterAcesso } from "../../lib/acesso"
import { getPool } from "../../lib/db"
import { banco } from "../support/banco"

vi.mock("server-only", () => ({}))
vi.mock("../../lib/acesso", () => ({ obterAcesso: vi.fn() }))

const comunidade = randomUUID()
const outraComunidade = randomUUID()
const operador = { tipo: "operador", perfil: "leitura", usuarioId: randomUUID(), comunidade } as const
const requisicao = (consulta = "") => new Request(`http://localhost/api/fila/resumo${consulta}`)

afterAll(async () => {
  try {
    await banco.query("delete from orbcommu.pedidos where comunidade = any($1::text[])", [[comunidade, outraComunidade]])
  } finally {
    await Promise.all([banco.end(), getPool().end()])
  }
})

it("recusa acesso anônimo, sem vínculo ou com senha pendente e valida o período", async () => {
  vi.mocked(obterAcesso).mockResolvedValueOnce({ tipo: "anonimo" })
  expect((await GET(requisicao())).status).toBe(401)
  vi.mocked(obterAcesso).mockResolvedValueOnce({ tipo: "sem_vinculo" })
  expect((await GET(requisicao())).status).toBe(403)
  vi.mocked(obterAcesso).mockResolvedValueOnce({ tipo: "definir_senha", usuarioId: operador.usuarioId, comunidade, versao: "v2" })
  expect((await GET(requisicao())).status).toBe(403)
  vi.mocked(obterAcesso).mockResolvedValueOnce(operador)
  expect((await GET(requisicao("?dias=8"))).status).toBe(400)
})

it("separa pendências atuais e coortes de recebimento no calendário de São Paulo", async () => {
  vi.mocked(obterAcesso).mockResolvedValue(operador)
  const vazio = await GET(requisicao())
  expect(vazio.status).toBe(200)
  expect(vazio.headers.get("Cache-Control")).toBe("private, no-store")
  expect(await vazio.json()).toEqual({
    dias: 7,
    atuais: { paraAnalisar: 0, aguardandoVaga: 0, chamadaIniciada: 0, aConferir: 0, esperaMaisAntigaMs: null },
    funil: { recebidos: 0, aprovados: 0, convitesEnviados: 0, entradasConfirmadas: 0 },
    divulgacoes: [],
    atualizarEmMs: null,
  })

  await banco.query(
    `with limites as (
       select now() as agora,
         (((now() at time zone 'America/Sao_Paulo')::date - 6)::timestamp at time zone 'America/Sao_Paulo') as inicio7,
         (((now() at time zone 'America/Sao_Paulo')::date - 29)::timestamp at time zone 'America/Sao_Paulo') as inicio30
     )
     insert into orbcommu.pedidos (comunidade, nome, telefone, origem, situacao, recebido_em, aprovado_em, enviado_em, encerrado_em)
     select comunidade, 'Exemplo', telefone, case when telefone = '7' then 'Workshop' else 'Link geral' end,
            situacao, recebido, aprovado, enviado, encerrado
     from limites cross join lateral (values
       ($1::text, '1', 'Para analisar', agora, null, null, null),
       ($1, '2', 'Para analisar', agora - interval '40 days', null, null, null),
       ($1, '3', 'Aguardando vaga', inicio7 - interval '1 second', agora, null, null),
       ($1, '4', 'Chamada iniciada', inicio7, agora, null, null),
       ($1, '5', 'Convite enviado', agora - interval '26 hours', agora - interval '26 hours', agora - interval '25 hours', null),
       ($1, '6', 'Convite enviado', agora - interval '3 hours', agora - interval '3 hours', agora - interval '2 hours', null),
       ($1, '7', 'Entrada confirmada', agora - interval '3 days', agora - interval '3 days', agora - interval '3 days', agora),
       ($1, '8', 'Prazo encerrado', inicio30, agora - interval '2 days', agora - interval '2 days', agora),
       ($1, '9', 'Entrada confirmada', inicio30 - interval '1 second', agora - interval '2 days', agora - interval '2 days', agora),
       ($2::text, '1', 'Para analisar', agora, null, null, null)
     ) as exemplos(comunidade, telefone, situacao, recebido, aprovado, enviado, encerrado)`,
    [comunidade, outraComunidade],
  )

  const sete = await (await GET(requisicao(`?comunidade=${outraComunidade}`))).json()
  expect(sete.atuais).toMatchObject({ paraAnalisar: 2, aguardandoVaga: 1, chamadaIniciada: 1, aConferir: 1 })
  const hora = 60 * 60 * 1000
  expect(sete.atuais.esperaMaisAntigaMs).toBeGreaterThanOrEqual(40 * 24 * hora)
  expect(sete.atuais.esperaMaisAntigaMs).toBeLessThan(40 * 24 * hora + 60000)
  expect(sete.atualizarEmMs).toBeGreaterThan(22 * hora - 60000)
  expect(sete.atualizarEmMs).toBeLessThanOrEqual(22 * hora)
  expect(sete.funil).toEqual({ recebidos: 5, aprovados: 4, convitesEnviados: 3, entradasConfirmadas: 1 })
  expect(sete.divulgacoes).toEqual([
    { nome: "Workshop", pedidos: 1, entradasConfirmadas: 1 },
    { nome: "Link geral", pedidos: 4, entradasConfirmadas: 0 },
  ])

  vi.mocked(obterAcesso).mockResolvedValueOnce({ ...operador, perfil: "operacao" })
  const trinta = await (await GET(requisicao("?dias=30"))).json()
  expect(trinta.dias).toBe(30)
  expect(trinta.atuais.aConferir).toBe(sete.atuais.aConferir)
  expect(trinta.funil).toEqual({ recebidos: 7, aprovados: 6, convitesEnviados: 4, entradasConfirmadas: 1 })
})
