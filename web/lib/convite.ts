export function normalizarConvite(valor: string): string | null {
  if (typeof valor !== "string") return null
  const convite = /^https:\/\/chat\.whatsapp\.com(?::443)?\/([a-z0-9]+)(?:[?#][^\r\n]*)?$/i.exec(valor.trim())
  return convite ? "https://chat.whatsapp.com/" + convite[1] : null
}

export function conversaDeConvite(telefone: string, convite: string): string {
  const mensagem = `Chegou a sua vez! Solicite entrada no grupo pelo WhatsApp em até 24 horas usando este convite: ${convite} Se você não solicitar dentro do prazo, perde a vez.`
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`
}
