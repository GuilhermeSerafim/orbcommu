export type Grupo = { membros: number; reservas: number; capacidade: number }

export function destino(
  modo: "ordem" | "equilibrio" | "sorteio",
  grupos: readonly Grupo[],
  aleatorio: () => number,
): number | null {
  const elegiveis = grupos
    .map(({ membros, reservas, capacidade }, indice) => ({ indice, ocupadas: membros + reservas, capacidade }))
    .filter(({ ocupadas, capacidade }) => ocupadas < capacidade)

  if (elegiveis.length === 0) return null
  if (modo === "ordem") return elegiveis[0].indice
  if (modo === "sorteio") return elegiveis[Math.floor(aleatorio() * elegiveis.length)].indice

  return elegiveis.reduce(
    (melhor, grupo) => grupo.ocupadas * melhor.capacidade < melhor.ocupadas * grupo.capacidade ? grupo : melhor,
    elegiveis[0],
  ).indice
}
