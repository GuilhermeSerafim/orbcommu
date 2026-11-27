"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowRight, Check, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { PedidoValido } from "../lib/entrada"
import type { FilaPublica } from "@/lib/filas-publicas"

type Campos = Partial<Record<keyof PedidoValido, string>>

export default function Formulario({ fila, divulgacao }: Readonly<{ fila: Omit<FilaPublica, "cartaz">; divulgacao?: string }>) {
  const [campos, setCampos] = useState<Campos>({})
  const [pronto, setPronto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [recebido, setRecebido] = useState(false)
  const [falhou, setFalhou] = useState(false)
  const [encerrada, setEncerrada] = useState(false)
  const titulo = useRef<HTMLHeadingElement>(null)

  useEffect(() => { setPronto(true) }, [])
  useEffect(() => { if (recebido || encerrada) titulo.current?.focus() }, [recebido, encerrada])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    const form = evento.currentTarget
    const pedido = Object.fromEntries(new FormData(form))
    setFalhou(false)
    setCampos({})
    setEnviando(true)
    try {
      const endpoint = new URL(`/api/pedidos/${fila.slug}`, window.location.origin)
      if (divulgacao) endpoint.searchParams.set("edicao", divulgacao)
      for (const origem of new URLSearchParams(window.location.search).getAll("origem")) {
        endpoint.searchParams.append("origem", origem)
      }
      const resposta = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido),
      })
      const resultado = await resposta.json()
      if (divulgacao && resposta.status === 410) {
        setEncerrada(true)
      } else if (resposta.status === 422) {
        setCampos(resultado.campos)
        const primeiro = form.elements.namedItem(Object.keys(resultado.campos)[0])
        if (primeiro instanceof HTMLElement) primeiro.focus()
      } else if (resposta.ok && resultado.recebido === true) {
        setRecebido(true)
      } else {
        setFalhou(true)
      }
    } catch {
      setFalhou(true)
    } finally {
      setEnviando(false)
    }
  }

  if (encerrada) return <section className="formulario-area recibo">
    <h1 ref={titulo} tabIndex={-1}>Divulgação encerrada</h1>
    <p className="introducao">O período terminou antes do envio deste pedido.</p>
  </section>

  if (recebido) return <section className="formulario-area recibo">
    <div className="secao-simbolo"><Check aria-hidden="true" size={25} /></div>
    <h1 ref={titulo} tabIndex={-1}>Recebemos seu pedido para entrar {fila.destino}.</h1>
    <p className="introducao">Se seu pedido for aprovado, a equipe vai chamar você pelo WhatsApp quando chegar a sua vez.</p>
  </section>

  return <section className="formulario-area">
    <h1>{fila.titulo}</h1>
    <p className="introducao">Se seu pedido for aprovado, a equipe entra em contato pelo WhatsApp.</p>
    <form method="post" className="formulario" noValidate onSubmit={enviar}>
      <noscript><p>Ative o JavaScript no navegador e recarregue esta página para enviar seu pedido.</p></noscript>
      <div className="campo">
        <Label htmlFor="nome">Como você quer ser chamado?</Label>
        <Input id="nome" name="nome" placeholder="Seu nome" autoComplete="given-name" required aria-invalid={!!campos.nome} aria-describedby={campos.nome ? "erro-nome" : undefined} />
        {campos.nome && <small id="erro-nome" role="alert">{campos.nome}</small>}
      </div>
      <div className="campo">
        <Label htmlFor="telefone">WhatsApp com DDD</Label>
        <Input id="telefone" name="telefone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" required aria-invalid={!!campos.telefone} aria-describedby={campos.telefone ? "erro-telefone" : undefined} />
        {campos.telefone && <small id="erro-telefone" role="alert">{campos.telefone}</small>}
      </div>
      <div className="campo">
        <div className="rotulo-opcional"><Label htmlFor="motivacao">O que você busca {fila.destino}?</Label><small id="opcional">Opcional</small></div>
        <Textarea id="motivacao" name="motivacao" rows={2} placeholder="Conte um pouco sobre o seu interesse" aria-invalid={!!campos.motivacao} aria-describedby={campos.motivacao ? "opcional erro-motivacao" : "opcional"} />
        {campos.motivacao && <small id="erro-motivacao" role="alert">{campos.motivacao}</small>}
      </div>
      {falhou && <p className="aviso-erro" role="alert">Não foi possível guardar seu pedido. Tente enviar novamente.</p>}
      <Button type="submit" className="acao-principal" disabled={!pronto || enviando}>
        Enviar pedido {enviando ? <LoaderCircle className="girar" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
      </Button>
    </form>
  </section>
}
