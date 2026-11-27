import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import { Pool } from "pg"

const local = parseEnv(readFileSync(new URL("../../.env.local", import.meta.url), "utf8"))
if (!local.DATABASE_URL) throw new Error("Execute local:prepare para preparar a fixture.")
const url = new URL(local.DATABASE_URL)
if (url.host !== "127.0.0.1:55422" || url.pathname !== "/postgres" || url.search) {
  throw new Error("A fixture exige o banco local do OrbCommu.")
}
process.env.DATABASE_URL = local.DATABASE_URL
export const banco = new Pool({ connectionString: local.DATABASE_URL, ssl: false })
