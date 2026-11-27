import { randomUUID } from "node:crypto"
import { afterAll, expect, it } from "vitest"
import { banco } from "../support/banco"
import { comFixtureConvite } from "../support/convite"

afterAll(() => banco.end())

it("restaura um convite preexistente mesmo se o teste falhar", async () => {
  const comunidade = randomUUID()
  const anterior = "https://chat.whatsapp.com/FixtureAnterior"
  const falha = new Error("Falha simulada")
  const consultar = async () => (await banco.query<{ convite: string }>(
    "select convite from orbcommu.convites_do_grupo where comunidade = $1", [comunidade],
  )).rows[0]?.convite

  await banco.query("insert into orbcommu.convites_do_grupo (comunidade, convite) values ($1, $2)", [comunidade, anterior])
  try {
    await expect(comFixtureConvite(comunidade, async (convite) => {
      expect(convite).toMatch(/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/)
      expect(convite).not.toBe(anterior)
      await banco.query("update orbcommu.convites_do_grupo set convite = $2 where comunidade = $1", [comunidade, convite])
      expect(await consultar()).toBe(convite)
      throw falha
    })).rejects.toBe(falha)
    expect(await consultar()).toBe(anterior)

    await comFixtureConvite(comunidade, async () => {
      expect(await consultar()).toBe(anterior)
    })
  } finally {
    await banco.query("delete from orbcommu.convites_do_grupo where comunidade = $1", [comunidade])
  }
})
