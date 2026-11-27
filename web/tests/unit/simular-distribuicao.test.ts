import { expect, test } from "vitest"
import { destino, type Grupo } from "../../lib/simular-distribuicao"

function g(membros: number, reservas: number, capacidade: number): Grupo {
  return { membros, reservas, capacidade }
}

test("escolhe somente grupos elegíveis", () => {
  expect(destino("ordem", [g(5, 0, 5), g(2, 0, 5)], () => 0)).toBe(1)
  expect(destino("equilibrio", [g(2, 2, 5), g(3, 0, 6)], () => 0)).toBe(1)
  expect(destino("equilibrio", [g(1, 1, 4), g(4, 0, 8)], () => 0)).toBe(0)
  expect(destino("sorteio", [g(3, 1, 4), g(2, 0, 2)], () => 0.99)).toBeNull()

  const grupos = [g(2, 0, 5), g(4, 1, 5), g(0, 0, 5)]
  expect(destino("sorteio", grupos, () => 0)).toBe(0)
  expect(destino("sorteio", grupos, () => 0.999999)).toBe(2)
})
