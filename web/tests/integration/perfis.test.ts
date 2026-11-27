import { afterAll, expect, it } from "vitest"
import { banco } from "../support/banco"
import { criarOperadores } from "../support/operadores"

afterAll(() => banco.end())

it("atribui leitura a um vínculo sem perfil explícito", async () => {
  const contas = await criarOperadores()
  try {
    const { rows } = await banco.query(
      `insert into orbcommu.operadores as o (comunidade, usuario_id)
       values ($1, $2) returning to_jsonb(o) as vinculo`,
      ["comunidade-exemplo", contas.semVinculo.id],
    )
    expect(rows[0].vinculo).toMatchObject({ perfil: "leitura" })
  } finally {
    await contas.limpar()
  }
}, 30_000)
