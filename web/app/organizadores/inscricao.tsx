"use client"

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Inscricao } from "@/lib/demonstracao"
import estilos from "./landing.module.css"

type Interesse = Inscricao["interesse"]
type Abertura = { interesse: Interesse; disparador: HTMLButtonElement }
type Sessao = Abertura & { id: number }

const AbrirInscricao = createContext<((abertura: Abertura) => void) | null>(null)

export function InscricaoProvider({ children }: { children: ReactNode }) {
  const [abertura, definirAbertura] = useState<Sessao | null>(null)
  const sessaoAtual = useRef<Sessao | null>(null)
  const sequencia = useRef(0)
  const dialogo = useRef<HTMLDialogElement>(null)
  const voltar = useRef<HTMLButtonElement>(null)
  const [confirmado, confirmar] = useState(false)

  useLayoutEffect(() => {
    if (abertura && !dialogo.current?.open) dialogo.current?.showModal()
  }, [abertura])

  useEffect(() => {
    if (confirmado) voltar.current?.focus()
  }, [confirmado])

  function fechar() {
    dialogo.current?.close()
  }

  function abrir(dados: Abertura) {
    const sessao = { ...dados, id: ++sequencia.current }
    sessaoAtual.current = sessao
    confirmar(false)
    definirAbertura(sessao)
  }

  function aoFechar() {
    // O evento close pode chegar depois de uma nova abertura.
    if (dialogo.current?.open) return
    const sessao = sessaoAtual.current
    sessaoAtual.current = null
    definirAbertura(null)
    confirmar(false)
    sessao?.disparador.focus()
  }

  return (
    <AbrirInscricao.Provider value={abrir}>
      {children}
      <dialog ref={dialogo} className={estilos.dialogo} aria-labelledby="inscricao-titulo" onClose={aoFechar}>
        <header className={estilos.cabecalhoDialogo}>
          <h2 id="inscricao-titulo">
            {confirmado ? "Inscrição confirmada" : abertura?.interesse === "edicao" ? "Interesse por edição" : "Fila da demonstração"}
          </h2>
          <Button type="button" variant="ghost" size="icon" className={estilos.fechar} aria-label="Fechar" onClick={fechar}>
            ×
          </Button>
        </header>
        <div role="status">
          {confirmado && <p className={estilos.textoDialogo}>Você entrou na fila da demonstração do OrbCommu. Agora é só aguardar.</p>}
        </div>
        {confirmado ? (
          <Button ref={voltar} type="button" className={estilos.acaoDialogo} onClick={fechar}>
            Voltar à página
          </Button>
        ) : abertura && (
          <Formulario key={abertura.id} interesse={abertura.interesse} aoConfirmar={() => {
            if (sessaoAtual.current === abertura && dialogo.current?.open) confirmar(true)
          }} />
        )}
      </dialog>
    </AbrirInscricao.Provider>
  )
}

export function BotaoDemonstracao({ interesse = "demonstracao" }: { interesse?: Interesse }) {
  const abrir = useContext(AbrirInscricao)
  if (!abrir) throw new Error("BotaoDemonstracao requer InscricaoProvider")

  return (
    <Button
      type="button"
      className={estilos.botaoDemonstracao}
      aria-haspopup="dialog"
      onClick={evento => abrir({ interesse, disparador: evento.currentTarget })}
    >
      {interesse === "edicao" ? "Tenho interesse nesta edição" : "Entrar na fila da demonstração"}
      <span aria-hidden="true">↗</span>
    </Button>
  )
}

function Formulario({ interesse, aoConfirmar }: { interesse: Interesse; aoConfirmar: () => void }) {
  const [canal, escolherCanal] = useState<Inscricao["canal"]>("email")
  const [contato, preencherContato] = useState("")
  const [erro, informarErro] = useState<"contato" | "envio" | null>(null)
  const [pendente, aguardar] = useState(false)
  const requisicao = useRef<AbortController | null>(null)
  const campo = useRef<HTMLInputElement>(null)
  const email = canal === "email"

  useEffect(() => () => requisicao.current?.abort(), [])

  function trocarCanal(novoCanal: Inscricao["canal"]) {
    escolherCanal(novoCanal)
    preencherContato("")
    informarErro(null)
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (requisicao.current) return

    const envio = new AbortController()
    requisicao.current = envio
    aguardar(true)
    informarErro(null)

    try {
      const resposta = await fetch("/api/demonstracao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canal, contato, interesse } satisfies Inscricao),
        signal: envio.signal,
      })
      if (resposta.status === 422) {
        informarErro("contato")
        campo.current?.focus()
        return
      }
      if (resposta.status === 200 && (await resposta.json())?.recebido === true && !envio.signal.aborted) {
        aoConfirmar()
        return
      }
      informarErro("envio")
    } catch {
      if (!envio.signal.aborted) informarErro("envio")
    } finally {
      requisicao.current = null
      aguardar(false)
    }
  }

  return (
    <>
      <p className={estilos.textoDialogo}>
        {interesse === "edicao"
          ? "Ao enviar, você entra na fila da demonstração e registra seu interesse por edição, sem agendar uma data nem contratar o serviço."
          : "Deixe um contato para entrar na fila da demonstração."}
      </p>
      <form onSubmit={enviar} noValidate>
        <fieldset className={estilos.canais} disabled={pendente}>
          <legend>Como prefere ser contatado?</legend>
          <Label>
            <input type="radio" name="canal" value="email" checked={email} onChange={() => trocarCanal("email")} />
            E-mail
          </Label>
          <Label>
            <input type="radio" name="canal" value="whatsapp" checked={!email} onChange={() => trocarCanal("whatsapp")} />
            WhatsApp
          </Label>
        </fieldset>
        <Label className={estilos.rotuloContato} htmlFor="inscricao-contato">{email ? "E-mail" : "WhatsApp com DDD"}</Label>
        <Input
          id="inscricao-contato"
          ref={campo}
          className={estilos.contato}
          type={email ? "email" : "tel"}
          autoComplete={email ? "email" : "tel"}
          placeholder={email ? "voce@exemplo.com" : "(11) 99999-0000"}
          value={contato}
          onChange={evento => {
            preencherContato(evento.target.value)
            informarErro(null)
          }}
          aria-invalid={erro === "contato" || undefined}
          aria-describedby={erro === "contato" ? "inscricao-erro" : undefined}
          readOnly={pendente}
          required
        />
        {erro && (
          <p role="alert" id="inscricao-erro" className={estilos.erro}>
            {erro === "envio" ? "Não foi possível confirmar sua inscrição. Tente enviar novamente."
              : email ? "Informe um e-mail válido, por exemplo voce@exemplo.com."
              : "Informe um WhatsApp com DDD, por exemplo (11) 99999-0000."}
          </p>
        )}
        <Button type="submit" className={estilos.acaoDialogo} disabled={pendente}>
          {pendente ? "Enviando…" : "Entrar na fila"}
        </Button>
      </form>
    </>
  )
}
