"use client"

import { animate, cubicBezier } from "motion/react"
import { useLayoutEffect, useRef } from "react"

/**
 * MIT + Commons Clause License Condition v1.0
 *
 * Copyright (c) 2026 David Haz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, and distribute the Software **as part of an application, website, or product**, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * ## Commons Clause Restriction
 *
 * You may use this Software, including for any commercial purpose, **so long as you do not sell, sublicense, or redistribute the components themselves-whether alone, in a bundle, or as a ported version.**
 *
 * The same restriction covers the React Bits tools (Background Studio, Texture Lab, Shape Magic, Center Stage, Sound Lab and any tools added later) and the sounds in the sound library. **You may not sell, sublicense, or redistribute the tools or the sounds themselves, or offer the tools or a substantially similar copy of them as a hosted service-whether alone, in a bundle, or as a ported version.**
 *
 * What you make with the tools is yours to use. You can use exported code, images, videos, and audio files in any personal or commercial application, website, or product, including paid ones. **You may not sell or redistribute the exports on their own, either individually or as the product itself, such as a sound, texture, background, or template pack.**
 *
 * ## No Warranty
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
// Adapted from the count mode of React Bits' Count Up by David Haz.
// https://github.com/DavidHDev/react-bits/blob/a30a9da9b40a91c5672fc8cd77785719e8e5b1e6/src/ts-default/TextAnimations/CountUp/CountUp.tsx
const easing = cubicBezier(0.33, 1, 0.68, 1)
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })

type CountUpProps = { to: number; startWhen: boolean; reducedMotion: boolean }

export default function CountUp({ to, startWhen, reducedMotion }: CountUpProps) {
  const texto = useRef<HTMLSpanElement>(null)
  const iniciou = useRef(false)
  const destino = Math.round(to)
  const valorFinal = numero.format(destino)

  useLayoutEffect(() => {
    const elemento = texto.current
    if (!elemento) return

    const reduzir = reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduzir || iniciou.current || destino === 0) {
      if (startWhen && reduzir) iniciou.current = true
      elemento.textContent = valorFinal
      return
    }

    elemento.textContent = "0"
    if (!startWhen) return

    let animacao: { stop(): void } | undefined
    const quadro = requestAnimationFrame(() => {
      iniciou.current = true
      animacao = animate(0, destino, {
        duration: 1.15,
        ease: easing,
        onUpdate: valor => { elemento.textContent = numero.format(Math.round(valor)) },
        onComplete: () => { elemento.textContent = valorFinal },
      })
    })

    return () => {
      cancelAnimationFrame(quadro)
      animacao?.stop()
    }
  }, [destino, valorFinal, startWhen, reducedMotion])

  return <span ref={texto} style={{ fontVariantNumeric: "tabular-nums" }}>{valorFinal}</span>
}
