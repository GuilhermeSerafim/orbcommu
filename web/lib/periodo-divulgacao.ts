export const fusoEvento = "America/Sao_Paulo"

export function hojeEmSaoPaulo() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: fusoEvento }).format(new Date())
}

export function diaValido(dia: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false
  const data = new Date(dia + "T12:00:00Z")
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === dia
}

export function mostrarDia(dia: string) {
  return dia.split("-").reverse().join("/")
}

export function uuidValido(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
