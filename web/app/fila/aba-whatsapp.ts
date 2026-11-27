"use client"
import { useRef } from "react"
import { usarWhatsAppWeb } from "../../lib/convite"

export type AberturaWhatsApp = { abrir: (url: string) => boolean; cancelar: () => void }

export function useAbaWhatsApp() {
  const origem = useRef<HTMLIFrameElement>(null)
  const aba = useRef<Window | null>(null)
  const nome = useRef("")
  const vazia = useRef(false)
  const ultimaTentativa = useRef(0)

  function preparar(guardarPedido: () => void): AberturaWhatsApp {
    const tentativa = ++ultimaTentativa.current
    if (usarWhatsAppWeb(navigator)) {
      return {
        abrir(url) {
          if (tentativa !== ultimaTentativa.current) return false
          guardarPedido()
          window.location.assign(url)
          return true
        },
        cancelar() {},
      }
    }
    if (!aba.current || aba.current.closed) {
      nome.current ||= "orbcommu-whatsapp-" + crypto.randomUUID()
      try {
        aba.current = origem.current?.contentWindow?.open("", nome.current) ?? null
      } catch {
        aba.current = null
      }
      vazia.current = !!aba.current
    }
    const alvo = aba.current

    function cancelar() {
      if (tentativa === ultimaTentativa.current && vazia.current) {
        alvo?.close()
        aba.current = null
        vazia.current = false
      }
    }

    function abrir(url: string) {
      if (tentativa !== ultimaTentativa.current || !alvo || alvo.closed) return false
      try {
        alvo.location.replace(url)
      } catch {
        cancelar()
        aba.current = null
        nome.current = ""
        return false
      }
      vazia.current = false
      try {
        alvo.focus()
      } catch {
        // A navegação já ocorreu mesmo se o navegador impedir a mudança de foco.
      }
      return true
    }

    return { abrir, cancelar }
  }

  return { origem, preparar }
}
