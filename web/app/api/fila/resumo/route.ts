import { obterAcesso } from "../../../../lib/acesso"
import { obterResumoFila } from "../../../../lib/painel-fila"

const headers = { "Cache-Control": "private, no-store" }

export async function GET(request: Request) {
  try {
    const acesso = await obterAcesso()
    if (acesso.tipo !== "operador") {
      return Response.json({ erro: "acesso" }, { status: acesso.tipo === "anonimo" ? 401 : 403, headers })
    }
    const dias = new URL(request.url).searchParams.get("dias") ?? "7"
    if (dias !== "7" && dias !== "30") {
      return Response.json({ erro: "filtro" }, { status: 400, headers })
    }
    return Response.json(await obterResumoFila(acesso, dias === "7" ? 7 : 30), { headers })
  } catch {
    return Response.json({ erro: "indisponivel" }, { status: 503, headers })
  }
}
