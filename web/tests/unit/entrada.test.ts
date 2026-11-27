import { expect, it } from "vitest"
import { normalizarTelefone, validarEntrada } from "../../lib/entrada"

it("normaliza DDD 55 sem perder dígitos", () => {
  expect(normalizarTelefone("(55) 91234-5678")).toBe("5555912345678")
  expect(normalizarTelefone("+55 55 91234-5678")).toBe("5555912345678")
})

it("valida a inscrição mínima", () => {
  expect(validarEntrada({ nome: " Ana ", telefone: "(11) 91234-5678" })).toEqual({
    ok: true,
    pedido: { nome: "Ana", telefone: "5511912345678", motivacao: null },
  })
})

it("rejeita dados incompletos", () => {
  expect(validarEntrada({ nome: "  ", telefone: "1234" })).toEqual({
    ok: false,
    campos: { nome: expect.any(String), telefone: expect.any(String) },
  })
})

it("rejeita corpo nulo", () => {
  expect(validarEntrada(null)).toEqual({
    ok: false,
    campos: { nome: expect.any(String), telefone: expect.any(String) },
  })
})

it.each([
  ["nome", 42],
  ["telefone", 11912345678],
  ["motivacao", ["Quero conhecer a comunidade"]],
] as const)("rejeita tipo inesperado em %s", (campo, valor) => {
  const entrada = { nome: "Ana", telefone: "(11) 91234-5678", [campo]: valor }
  expect(validarEntrada(entrada)).toEqual({ ok: false, campos: { [campo]: expect.any(String) } })
})

it("preserva a motivação e descarta campos definidos no servidor", () => {
  expect(validarEntrada({
    nome: "Ana",
    telefone: "55 (11) 1234-5678",
    motivacao: "  Quero conhecer a comunidade.  ",
    comunidade: "outra",
    origem: "evento",
    situacao: "aprovado",
  })).toEqual({
    ok: true,
    pedido: { nome: "Ana", telefone: "551112345678", motivacao: "Quero conhecer a comunidade." },
  })
})

it("rejeita número internacional de outro país", () => {
  expect(validarEntrada({ nome: "Ana", telefone: "+44 11 91234-5678" })).toEqual({
    ok: false,
    campos: { telefone: expect.any(String) },
  })
})
