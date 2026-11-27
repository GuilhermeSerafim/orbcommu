export function normalizarConvite(valor: string): string | null {
  if (typeof valor !== "string") return null
  const convite = /^https:\/\/chat\.whatsapp\.com(?::443)?\/([a-z0-9]+)(?:[?#][^\r\n]*)?$/i.exec(valor.trim())
  return convite ? "https://chat.whatsapp.com/" + convite[1] : null
}

export function conversaDeConvite(telefone: string, convite: string): string {
  const url = new URL("https://wa.me/" + telefone)
  url.searchParams.set("text", "Chegou a sua vez! Solicite entrada no grupo pelo WhatsApp em até 24 horas usando este convite: " + convite + "\nSe você não solicitar dentro do prazo, perde a vez.")
  return url.toString()
}
