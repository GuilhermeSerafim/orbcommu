"use client"
import { useRef } from "react"

export function useAbaWhatsApp() {
  const origem = useRef<HTMLIFrameElement>(null)
  const aba = useRef<Window | null>(null)
  const nome = useRef("")
  const vazia = useRef(false)
  const ultimaTentativa = useRef(0)

  function preparar() {
    const tentativa = ++ultimaTentativa.current
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
      alvo.focus()
      return true
    }

    return { abrir, cancelar }
  }

  return { origem, preparar }
}
