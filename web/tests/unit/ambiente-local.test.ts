import { execFileSync } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parseEnv } from "node:util"
import { expect, it } from "vitest"

it("dois preparos preservam configurações extras, comentários e valores multilinha", () => {
  const root = mkdtempSync(join(tmpdir(), "orbcommu-preparo-"))
  try {
    const cliDir = join(root, "node_modules/supabase/dist")
    mkdirSync(cliDir, { recursive: true })
    mkdirSync(join(root, "scripts"))
    const script = join(root, "scripts/ambiente-local.mjs")
    copyFileSync(new URL("../../scripts/ambiente-local.mjs", import.meta.url), script)
    const status = [
      "DB_URL=postgresql://127.0.0.1:55422/postgres",
      "API_URL=http://127.0.0.1:55421",
      "ANON_KEY=publica-ficticia",
      "SERVICE_ROLE_KEY=fixture-ficticia",
    ].join("\n")
    writeFileSync(join(cliDir, "supabase.js"), `if (process.argv[2] === 'status') console.log(${JSON.stringify(status)})`)

    const path = join(root, ".env.local")
    const extra = '# preferência local\r\nEXTRA="linha 1\r\nDATABASE_URL=texto dentro da variável\r\nlinha 3"\r\n'
    const original = extra + 'DATABASE_URL="old\\"\nOTHER="keep"\n'
    writeFileSync(path, original)
    let primeira = ""
    for (let i = 0; i < 2; i++) {
      execFileSync(process.execPath, [script])
      const content = readFileSync(path, "utf8")
      expect(content).toContain(extra)
      expect(parseEnv(content).OTHER).toBe("keep")
      expect(content.startsWith(original)).toBe(true)
      expect(parseEnv(content).DATABASE_URL).toBe("postgresql://127.0.0.1:55422/postgres")
      if (i === 0) primeira = content
      else expect(content).toBe(primeira)
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
