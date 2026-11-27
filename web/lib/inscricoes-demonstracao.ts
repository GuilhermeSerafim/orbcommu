import "server-only"
import { getPool } from "./db"
import type { Inscricao } from "./demonstracao"

export async function registrarInscricao(i: Inscricao): Promise<void> {
  await getPool().query(
    `insert into orbcommu.inscricoes_demonstracao (canal, contato, interesse)
     values ($1, $2, $3)
     on conflict (canal, contato) do nothing`,
    [i.canal, i.contato, i.interesse],
  )
}
