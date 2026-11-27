import { NextResponse } from "next/server"
import { afterEach, expect, it, vi } from "vitest"
import { clienteAuth } from "../../lib/cliente-auth"

afterEach(() => vi.unstubAllEnvs())

it.each([
  ["https://projeto.example.test", undefined, true],
  ["http://auth.example.test", undefined, true],
  ["http://127.0.0.1:55421", undefined, false],
  ["http://127.0.0.1:55421", "https://piloto.example.test", true],
] as const)("serializa cookies SSR para Auth %s e Render %s com Secure=%s", async (url, publica, seguro) => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url)
  vi.stubEnv("RENDER_EXTERNAL_URL", publica)
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "chave-de-exemplo")
  const resposta = NextResponse.next()
  const { auth } = clienteAuth({
    getAll: () => [],
    setAll(atualizados) {
      for (const { name, value, options } of atualizados) resposta.cookies.set(name, value, options)
    },
  })
  // Iniciar PKCE grava cookies pelo SSR sem fazer requisições ao provedor.
  await auth.signInWithOAuth({ provider: "github", options: { skipBrowserRedirect: true } })
  const cookies = resposta.headers.getSetCookie()
  expect(cookies.length).toBeGreaterThan(0)
  for (const cookie of cookies) {
    expect(cookie).toMatch(/; HttpOnly/i)
    expect(cookie).toMatch(/; SameSite=lax/i)
    expect(/; Secure(?:;|$)/i.test(cookie)).toBe(seguro)
  }
})
