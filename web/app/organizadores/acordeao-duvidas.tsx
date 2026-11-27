"use client"

import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import estilos from "./landing.module.css"

export function AcordeaoDuvidas({ perguntas }: { perguntas: readonly (readonly [string, string])[] }) {
  const [abertas, setAbertas] = useState<string[]>([])

  return (
    <Accordion type="multiple" value={abertas} onValueChange={setAbertas} className={estilos.acordeaoDuvidas}>
      {perguntas.map(([pergunta, resposta]) => {
        const fechada = !abertas.includes(pergunta)
        return (
          <AccordionItem key={pergunta} value={pergunta} className={estilos.itemDuvida}>
            <AccordionTrigger className={estilos.pergunta}>{pergunta}</AccordionTrigger>
            <AccordionContent forceMount inert={fechada} aria-hidden={fechada} className={estilos.painelResposta}>
              <p className={estilos.resposta}>{resposta}</p>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
