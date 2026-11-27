import { createServerClient, type CookieMethodsServer } from "@supabase/ssr"

export function clienteAuth(cookies: CookieMethodsServer) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies, cookieOptions: { httpOnly: true, sameSite: "lax" } },
  )
}
