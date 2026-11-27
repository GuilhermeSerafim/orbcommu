export function normalizarConvite(valor: string): string | null {
  if (typeof valor !== "string") return null
  const convite = /^https:\/\/chat\.whatsapp\.com(?::443)?\/([a-z0-9]+)(?:[?#][^\r\n]*)?$/i.exec(valor.trim())
  return convite ? "https://chat.whatsapp.com/" + convite[1] : null
}
