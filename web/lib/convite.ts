export function normalizarConvite(valor: string): string | null {
  if (typeof valor !== "string") return null
  const convite = /^https:\/\/chat\.whatsapp\.com(?::443)?\/([a-z0-9]+)(?:[?#][^\r\n]*)?$/i.exec(valor.trim())
  return convite ? "https://chat.whatsapp.com/" + convite[1] : null
}

export function conversaDeConvite(telefone: string, convite: string): string {
  const mensagem = `Chegou a sua vez! Solicite entrada no grupo pelo WhatsApp em até 24 horas usando este convite: ${convite} Se você não solicitar dentro do prazo, perde a vez.`
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`
}

type Navegador = Pick<Navigator, "userAgent" | "maxTouchPoints">

export function usarWhatsAppDesktop({ userAgent, maxTouchPoints }: Navegador) {
  return !/Android|iPhone|iPad|iPod|Mobi/i.test(userAgent)
    && !(/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
}

export function destinoDaConversa(link: string, navegador: Navegador) {
  if (!usarWhatsAppDesktop(navegador)) return link
  const origem = new URL(link)
  const telefone = origem.pathname.slice(1)
  const texto = origem.searchParams.get("text")
  return "whatsapp://send?phone=" + encodeURIComponent(telefone)
    + (texto === null ? "" : "&text=" + encodeURIComponent(texto))
}
