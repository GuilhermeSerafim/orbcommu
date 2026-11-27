import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
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
  const file = new URL(path, import.meta.url)
  let previous = ""
  try {
    previous = readFileSync(file, "utf8")
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }

  const begin = "# >>> OrbCommu local:prepare (gerado) >>>\n"
  const end = "# <<< OrbCommu local:prepare (gerado) <<<\n"
  const start = previous.lastIndexOf(begin)
  let preserved = previous
  if (start >= 0 && (start === 0 || previous[start - 1] === "\n") && previous.endsWith(end)) {
    const block = previous.slice(start + begin.length, -end.length)
    const parsed = parseEnv(block)
    const canonical = Object.keys(vars).map(key => `${key}="${parsed[key]}"\n`).join("")
    if (block === canonical) preserved = previous.slice(0, start)
  }

  const managed = Object.entries(vars).map(([k, v]) => {
    if (!v || /[\r\n"]/.test(v)) throw new Error(`Valor local inválido para ${k}.`)
    return `${k}="${v}"\n`
  }).join("")
  const separator = preserved.length && !preserved.endsWith("\n") ? "\n" : ""
  const content = preserved + separator + begin + managed + end
  const effective = parseEnv(content)
  for (const [key, value] of Object.entries(vars)) {
    if (effective[key] !== value) throw new Error(`O arquivo local impede a configuração de ${key}.`)
  }
  if (content !== previous) writeFileSync(file, content, { mode: 0o600 })
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
  SUPABASE_ADMIN_KEY: status.SERVICE_ROLE_KEY,
})
mkdirSync(new URL("../tests/", import.meta.url), { recursive: true })
save("../tests/.env.fixture", { SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY })
console.log("Banco e Auth locais preparados.")
