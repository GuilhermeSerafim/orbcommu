"use client"

import { Menu, X } from "lucide-react"
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react"
import { SimboloOrbCommu } from "@/components/marca-orbcommu"
import { BotaoDemonstracao } from "./inscricao"
import estilos from "./landing.module.css"

export function CabecalhoLanding({ navegacao }: { navegacao: ReactNode }) {
  const [aberto, definirAberto] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto) return
    const compacto = window.matchMedia("(max-width: 900px)")
    function ajustar(evento: MediaQueryListEvent) {
      if (!evento.matches) definirAberto(false)
    }
    compacto.addEventListener("change", ajustar)
    return () => compacto.removeEventListener("change", ajustar)
  }, [aberto])

  function seguirLink(evento: MouseEvent<HTMLElement>) {
    if (!aberto || evento.defaultPrevented || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return
    const link = evento.target instanceof Element && evento.target.closest("a[href]")
    if (!(link instanceof HTMLAnchorElement)) return

    // A navegação nativa cuida da URL e da rolagem. O foco acompanha a seção ao recolher os links.
    if (link.getAttribute("href")?.startsWith("#")) {
      const secao = document.getElementById(link.hash.slice(1))
      if (secao) {
        secao.tabIndex = -1
        secao.focus({ preventScroll: true })
      }
    }
    definirAberto(false)
  }

  return (
    <header className={`${estilos.largura} ${estilos.cabecalho}`} onClick={seguirLink}
      onKeyDown={evento => {
        if (evento.key === "Escape" && aberto) {
          definirAberto(false)
          botao.current?.focus()
        }
      }}>
      <a href="#inicio" className="marca"><SimboloOrbCommu />OrbCommu</a>
      <button type="button" className={estilos.botaoMenu} aria-expanded={aberto} aria-controls="menu-cabecalho"
        ref={botao} onClick={() => definirAberto(!aberto)}>
        {aberto ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
        Menu
      </button>
      <div id="menu-cabecalho" className={estilos.painelMenu} data-aberto={aberto}>
        {navegacao}
        <div className={estilos.acoesCabecalho}><BotaoDemonstracao /></div>
      </div>
    </header>
  )
}
