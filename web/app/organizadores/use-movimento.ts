"use client"

import { useEffect, useState, type RefObject } from "react"

export function useMovimento(ref: RefObject<HTMLElement | null>) {
  const [visivel, definirVisivel] = useState(false)
  const [abaVisivel, definirAbaVisivel] = useState(false)
  const [reduzido, definirReduzido] = useState(false)
  const [pausado, definirPausado] = useState(false)

  useEffect(() => {
    const secao = ref.current
    if (!secao) return

    const preferencia = window.matchMedia("(prefers-reduced-motion: reduce)")
    const atualizarPreferencia = () => definirReduzido(preferencia.matches)
    const atualizarAba = () => definirAbaVisivel(!document.hidden)
    const observador = new IntersectionObserver(([entrada]) => definirVisivel(entrada.isIntersecting))

    atualizarPreferencia()
    atualizarAba()
    observador.observe(secao)
    preferencia.addEventListener("change", atualizarPreferencia)
    document.addEventListener("visibilitychange", atualizarAba)

    return () => {
      observador.disconnect()
      preferencia.removeEventListener("change", atualizarPreferencia)
      document.removeEventListener("visibilitychange", atualizarAba)
    }
  }, [ref])

  return {
    automatico: visivel && abaVisivel && !reduzido && !pausado,
    alternarPausa: () => definirPausado(estado => !estado),
    pausado,
    reduzido,
  }
}
