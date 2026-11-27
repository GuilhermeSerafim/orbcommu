"use client"

import { useState } from "react"
import estilos from "./landing.module.css"

const etapas = [
  { estado: "Convite pronto para envio", acao: "Simular envio" },
  { estado: "Convite enviado", acao: "Confirmar entrada" },
  { estado: "Entrada confirmada", acao: "Recomeçar" },
]

export function Convite() {
  const [etapa, atualizarEtapa] = useState(0)
  const { estado, acao } = etapas[etapa]

  return (
    <section className={estilos.convite} aria-labelledby="titulo-convite">
      <div className={`${estilos.largura} ${estilos.conviteLayout}`}>
        <div>
          <h2 id="titulo-convite">Um convite de cada vez, pelo WhatsApp.</h2>
          <p>Quando surgir uma vaga, a equipe envia a mensagem e registra o envio. Depois de conferir o grupo, confirma a entrada.</p>
        </div>
        <div className={estilos.mensagem}>
          <small>Conversa de exemplo · Ana</small>
          <p>Oi, Ana! Abriu uma vaga na comunidade. Posso te enviar o convite?</p>
          <strong role="status">{estado}</strong>
          <button type="button" onClick={() => atualizarEtapa(atual => (atual + 1) % etapas.length)}>{acao}</button>
        </div>
      </div>
    </section>
  )
}
