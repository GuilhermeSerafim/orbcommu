import { createServerClient, type CookieMethodsServer } from "@supabase/ssr"

export const MINIMO_CARACTERES_SENHA = 6

export function clienteAuth(cookies: CookieMethodsServer) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const origem = new URL(process.env.RENDER_EXTERNAL_URL || supabaseUrl)
  const httpLocal = origem.protocol === "http:" && ["127.0.0.1", "[::1]", "localhost"].includes(origem.hostname)
  return createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies, cookieOptions: { httpOnly: true, sameSite: "lax", secure: !httpLocal } },
  )
}
