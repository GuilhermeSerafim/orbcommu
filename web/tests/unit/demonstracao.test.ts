import { expect, it, vi } from "vitest"
import { receberInscricao, validarInscricao } from "../../lib/demonstracao"

const inscricao = { canal: "email", contato: " ANA@example.org ", interesse: "edicao" }
const normalizada = { ...inscricao, contato: "ana@example.org" }

function requisicao(body = JSON.stringify(inscricao)) {
  return new Request("http://localhost/api/demonstracao", { method: "POST", body })
}

it("valida e normaliza o canal escolhido", () => {
  expect(validarInscricao(inscricao)).toEqual(normalizada)
  expect(validarInscricao({ canal: "whatsapp", contato: "(11) 91234-5678", interesse: "demonstracao" }))
    .toEqual({ canal: "whatsapp", contato: "5511912345678", interesse: "demonstracao" })
})

it.each([
  null,
  [],
  { ...inscricao, canal: "sms" },
  { ...inscricao, interesse: "outro" },
  { ...inscricao, contato: 123 },
  { ...inscricao, contato: "sem-arroba" },
  { ...inscricao, contato: "ana@example" },
  { ...inscricao, contato: "ana@exa mple.org" },
  { ...inscricao, contato: "a".repeat(243) + "@example.org" },
  { ...inscricao, canal: "whatsapp", contato: "91234-5678" },
].map(entrada => [entrada]))("rejeita a inscrição inválida %j", entrada => {
  expect(validarInscricao(entrada)).toBeNull()
})

it("responde só depois da gravação", async () => {
  let liberar!: () => void
  const pendente = new Promise<void>(resolve => { liberar = resolve })
  const gravar = vi.fn(() => pendente)
  const concluido = vi.fn()
  const envio = receberInscricao(requisicao(), gravar).then(resposta => {
    concluido()
    return resposta
  })

  try {
    await vi.waitFor(() => expect(gravar).toHaveBeenCalledExactlyOnceWith(normalizada))
    expect(concluido).not.toHaveBeenCalled()
  } finally {
    liberar()
  }
  const resposta = await envio
  expect(resposta.status).toBe(200)
  expect(await resposta.json()).toEqual({ recebido: true })
})

it("devolve 400 quando o JSON está quebrado e 422 quando o contato é inválido", async () => {
  const gravar = vi.fn()
  expect((await receberInscricao(requisicao("{"), gravar)).status).toBe(400)
  const invalida = requisicao(JSON.stringify({ ...inscricao, contato: "sem-arroba" }))
  expect((await receberInscricao(invalida, gravar)).status).toBe(422)
  expect(gravar).not.toHaveBeenCalled()
})

it("devolve 503 sem expor detalhes da falha de gravação", async () => {
  const resposta = await receberInscricao(requisicao(), async () => { throw new Error("falha interna") })
  expect(resposta.status).toBe(503)
  expect(await resposta.json()).toEqual({ erro: "indisponivel" })
})

it.each([
  "ana@ex/ample.org",
  "ana,silva@example.org",
  ".ana@example.org",
  "ana.@example.org",
  "ana..silva@example.org",
  "a".repeat(65) + "@example.org",
  "a\u0000na@example.org",
  "ana@example.-org",
  "ana@example.org-",
  "ana@ex_ample.org",
])("devolve 422 sem tentar gravar o e-mail inválido %j", async contato => {
  const gravar = vi.fn()
  const resposta = await receberInscricao(requisicao(JSON.stringify({ ...inscricao, contato })), gravar)
  expect(resposta.status).toBe(422)
  expect(gravar).not.toHaveBeenCalled()
})

it.each(["Ana.silva+evento", "Ana_Silva-Jr", "Ana.O'Neil"])("preserva caracteres usuais em %s", local => {
  expect(validarInscricao({ ...inscricao, contato: `${local}@Sub.Example.org` }))
    .toEqual({ ...inscricao, contato: `${local.toLowerCase()}@sub.example.org` })
})
