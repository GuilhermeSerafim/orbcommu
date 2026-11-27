import "server-only"
import { Pool } from "pg"

let pool: Pool | undefined

export function getPool(): Pool {
  if (pool) return pool
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error("DATABASE_URL ausente.")
  const url = new URL(raw)
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.search || !url.hostname) {
    throw new Error("Use uma URL PostgreSQL com hostname e sem parâmetros de conexão.")
  }
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
  const ca = process.env.DATABASE_CA_PEM?.replace(/\\n/g, "\n")
  pool = new Pool({
    connectionString: raw,
    max: 4,
    ssl: local && !ca ? false : { rejectUnauthorized: true, ca },
  })
  return pool
}
