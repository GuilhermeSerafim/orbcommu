import { normalizarTelefone } from "./entrada"

export type Inscricao = {
  canal: "email" | "whatsapp"
  contato: string
  interesse: "demonstracao" | "edicao"
}

function normalizarEmail(valor: string): string | null {
  const email = valor.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email) ? email : null
}

export function validarInscricao(raw: unknown): Inscricao | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const { canal, contato, interesse } = raw as Record<string, unknown>
  if (canal !== "email" && canal !== "whatsapp") return null
  if (interesse !== "demonstracao" && interesse !== "edicao") return null
  if (typeof contato !== "string") return null

  const normalizado = canal === "email" ? normalizarEmail(contato) : normalizarTelefone(contato)
  return normalizado ? { canal, contato: normalizado, interesse } : null
}

export async function receberInscricao(
  req: Request,
  gravar: (i: Inscricao) => Promise<void>,
): Promise<Response> {
  let entrada: unknown
  try {
    entrada = await req.json()
  } catch {
    return Response.json({ erro: "json_invalido" }, { status: 400 })
  }

  const inscricao = validarInscricao(entrada)
  if (!inscricao) return Response.json({ erro: "inscricao_invalida" }, { status: 422 })

  try {
    await gravar(inscricao)
  } catch {
    return Response.json({ erro: "indisponivel" }, { status: 503 })
  }
  return Response.json({ recebido: true })
}
