"use client"

import { useEffect, useRef } from "react"

export default function Abertura({ slug, edicao }: Readonly<{ slug: string; edicao: string }>) {
  const visita = useRef<string | null>(null)
  useEffect(() => {
    function registrar() {
      if (document.visibilityState !== "visible" || visita.current) return
      visita.current = crypto.randomUUID()
      void fetch(`/api/pedidos/${slug}/aberturas`, { method: "POST", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ edicao, visita: visita.current }),
      }).catch(() => {})
    }
    registrar()
    document.addEventListener("visibilitychange", registrar)
    return () => document.removeEventListener("visibilitychange", registrar)
  }, [slug, edicao])
  return null
}
