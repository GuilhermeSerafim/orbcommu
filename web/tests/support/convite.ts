import { randomUUID } from "node:crypto"
import { banco } from "./banco"

export async function comFixtureConvite<T>(comunidade: string, executar: (convite: string) => Promise<T>): Promise<T> {
  const convite = "https://chat.whatsapp.com/Fixture" + randomUUID().replaceAll("-", "")
  const chave = "orbcommu.fixture.convite." + comunidade
  const cliente = await banco.connect()
  try {
    await cliente.query("select pg_advisory_lock(hashtextextended($1, 0))", [chave])
    const { rows } = await cliente.query<{ convite: string }>(
      "select convite from orbcommu.convites_do_grupo where comunidade = $1",
      [comunidade],
    )
    const anterior = rows[0]?.convite
    try {
      return await executar(convite)
    } finally {
      if (anterior) {
        await cliente.query(
          "update orbcommu.convites_do_grupo set convite = $3 where comunidade = $1 and convite = $2",
          [comunidade, convite, anterior],
        )
      } else {
        await cliente.query(
          "delete from orbcommu.convites_do_grupo where comunidade = $1 and convite = $2",
          [comunidade, convite],
        )
      }
    }
  } finally {
    // Encerra a sessão dedicada e libera o advisory lock mesmo se o setup falhar.
    cliente.release(true)
  }
}
