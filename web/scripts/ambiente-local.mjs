import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"

const root = fileURLToPath(new URL("../", import.meta.url))
const cli = fileURLToPath(new URL("../node_modules/supabase/dist/supabase.js", import.meta.url))
function run(args) {
  try {
    return execFileSync(process.execPath, [cli, ...args], {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024,
    })
  } catch {
    throw new Error(`Falhou supabase ${args.slice(0, 2).join(" ")}. Confira o Docker e o estado da pilha local.`)
  }
}
function save(path, vars) {
  const content = Object.entries(vars).map(([k, v]) => {
    if (!v || /[\r\n"]/.test(v)) throw new Error(`Valor local inválido para ${k}.`)
    return `${k}="${v}"\n`
  }).join("")
  writeFileSync(new URL(path, import.meta.url), content, { mode: 0o600 })
}

run(["start", "-x", "realtime,storage-api,imgproxy,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor"])
const status = parseEnv(run(["status", "-o", "env"]))
const db = new URL(status.DB_URL)
const api = new URL(status.API_URL)
if (db.host !== "127.0.0.1:55422" || db.pathname !== "/postgres" || api.origin !== "http://127.0.0.1:55421") {
  throw new Error("Os destinos da pilha local não conferem.")
}
run(["migration", "up", "--local"])
save("../.env.local", {
  DATABASE_URL: status.DB_URL,
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
})
mkdirSync(new URL("../tests/", import.meta.url), { recursive: true })
save("../tests/.env.fixture", { SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY })
console.log("Banco e Auth locais preparados.")
