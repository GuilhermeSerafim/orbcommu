import { expect, it, vi } from "vitest"
import { receberPedido } from "../../lib/receber"

function requisicao(body = JSON.stringify({ nome: "Ana", telefone: "(11) 91234-5678" })) {
  return new Request("http://localhost/api/pedidos", { method: "POST", body })
}

it("confirma apenas após a gravação", async () => {
  let liberar!: () => void
  const escrita = new Promise<void>(resolve => { liberar = resolve })
  const gravar = vi.fn(() => escrita)
  const concluido = vi.fn()
  const resposta = receberPedido(requisicao(), gravar).then(r => { concluido(); return r })
  await vi.waitFor(() => expect(gravar).toHaveBeenCalledOnce())
  expect(concluido).not.toHaveBeenCalled()
  liberar()
  expect((await resposta).status).toBe(200)
  expect(await (await resposta).json()).toEqual({ recebido: true })
})

it("falha de gravação devolve 503", async () => {
  const resposta = await receberPedido(requisicao(), async () => { throw Error() })
  expect(resposta.status).toBe(503)
  expect(await resposta.json()).toEqual({ erro: "indisponivel" })
})

it("devolve os erros de campo sem gravar", async () => {
  const gravar = vi.fn()
  const resposta = await receberPedido(requisicao("{}"), gravar)
  expect(resposta.status).toBe(422)
  expect(await resposta.json()).toEqual({ campos: {
    nome: "Informe como você quer ser chamado.",
    telefone: "Informe um WhatsApp com DDD, por exemplo (11) 91234-5678.",
  } })
  expect(gravar).not.toHaveBeenCalled()
})

it("JSON ilegível devolve 400 sem gravar", async () => {
  const gravar = vi.fn()
  const resposta = await receberPedido(requisicao("{"), gravar)
  expect(resposta.status).toBe(400)
  expect(gravar).not.toHaveBeenCalled()
})
