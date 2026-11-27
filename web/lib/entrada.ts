export function normalizarTelefone(valor: string): string | null {
  const texto = valor.trim()
  if (!/^[+\d\s().-]+$/.test(texto)) return null

  let digitos = texto.replace(/\D/g, "")
  if (texto.startsWith("+") || digitos.length > 11) {
    if (!digitos.startsWith("55")) return null
    digitos = digitos.slice(2)
  }

  return /^[1-9][1-9]\d{8,9}$/.test(digitos) ? "55" + digitos : null
}

export type PedidoValido = { nome: string; telefone: string; motivacao: string | null }

export type ResultadoEntrada =
  | { ok: true; pedido: PedidoValido }
  | { ok: false; campos: Partial<Record<keyof PedidoValido, string>> }

export function validarEntrada(valor: unknown): ResultadoEntrada {
  const entrada = valor !== null && typeof valor === "object" && !Array.isArray(valor)
    ? valor as Record<string, unknown>
    : {}
  const nome = typeof entrada.nome === "string" ? entrada.nome.trim() : ""
  const telefone = typeof entrada.telefone === "string" ? normalizarTelefone(entrada.telefone) : null
  const campos: Partial<Record<keyof PedidoValido, string>> = {}
  if (!nome) campos.nome = "Informe como você quer ser chamado."
  if (!telefone) campos.telefone = "Informe um WhatsApp com DDD, por exemplo (11) 91234-5678."
  if (entrada.motivacao != null && typeof entrada.motivacao !== "string") {
    campos.motivacao = "Informe a motivação em texto."
  }
  if (!nome || !telefone || campos.motivacao) return { ok: false, campos }

  const motivacao = typeof entrada.motivacao === "string" ? entrada.motivacao.trim() || null : null
  return { ok: true, pedido: { nome, telefone, motivacao } }
}
