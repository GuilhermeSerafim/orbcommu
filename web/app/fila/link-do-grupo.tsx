"use client"

import { useState, useTransition, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { salvarConvite } from "./acoes"

const avisos = {
  acesso: "Sua conta não tem permissão para alterar o link.",
  link_invalido: "Informe um link de convite do grupo do WhatsApp.",
  indisponivel: "Não foi possível salvar o link. Tente novamente.",
}

export default function LinkDoGrupo({ convite }: { convite: string | null }) {
  const [valor, setValor] = useState(convite ?? "")
  const [aviso, setAviso] = useState("")
  const [invalido, setInvalido] = useState(false)
  const [salvando, iniciar] = useTransition()

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setAviso("")
    setInvalido(false)
    iniciar(async () => {
      try {
        const resultado = await salvarConvite(valor)
        if (resultado.ok) {
          setValor(resultado.convite)
          setAviso("Link salvo.")
        } else {
          setInvalido(resultado.motivo === "link_invalido")
          setAviso(avisos[resultado.motivo])
        }
      } catch {
        setAviso(avisos.indisponivel)
      }
    })
  }

  return (
    <details className="configuracao-grupo">
      <summary>Link do grupo</summary>
      <form onSubmit={enviar}>
        <Label htmlFor="convite-do-grupo">Link de convite do WhatsApp</Label>
        <div className="configuracao-grupo-campo">
          <Input id="convite-do-grupo" inputMode="url" autoComplete="off"
            value={valor} onChange={evento => {
              setValor(evento.target.value)
              setAviso("")
              setInvalido(false)
            }} readOnly={salvando}
            aria-invalid={invalido} aria-describedby="aviso-convite" />
          <Button type="submit" disabled={salvando}>Salvar link</Button>
        </div>
        <p id="aviso-convite" role="status">{aviso}</p>
      </form>
    </details>
  )
}
