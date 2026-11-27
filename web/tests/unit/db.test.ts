import { afterEach, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

it("exige TLS verificado fora do loopback e aceita a CA do servidor", async () => {
  vi.stubEnv("DATABASE_URL", "postgres://usuario@banco.example.org:5432/postgres")
  vi.stubEnv("DATABASE_CA_PEM", "linha1\\nlinha2")
  const { getPool } = await import("../../lib/db")
  const pool = getPool()
  expect(pool.options.max).toBe(4)
  expect(pool.options.ssl).toEqual({ rejectUnauthorized: true, ca: "linha1\nlinha2" })
  await pool.end()
})

it("rejeita opções da URL que poderiam substituir a política TLS", async () => {
  vi.stubEnv("DATABASE_URL", "postgres://usuario@banco.example.org/postgres?sslmode=disable")
  const { getPool } = await import("../../lib/db")
  expect(getPool).toThrow("sem parâmetros")
})
