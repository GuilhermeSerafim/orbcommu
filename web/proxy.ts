import { NextResponse, type NextRequest } from "next/server"
import { clienteAuth } from "./lib/cliente-auth"

export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request })
  const { auth } = clienteAuth({
    getAll: () => request.cookies.getAll(),
    setAll(atualizados, headers) {
      for (const { name, value } of atualizados) request.cookies.set(name, value)
      resposta = NextResponse.next({ request })
      for (const { name, value, options } of atualizados) resposta.cookies.set(name, value, options)
      for (const [name, value] of Object.entries(headers)) resposta.headers.set(name, value)
    },
  })
  await auth.getUser()
  resposta.headers.set("Cache-Control", "private, no-store")
  return resposta
}

export const config = { matcher: ["/entrar/:path*", "/fila/:path*", "/api/fila"] }
