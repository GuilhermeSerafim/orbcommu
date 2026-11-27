"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { encerrar } from "../acoes"

export function Material({ caminho, id }: Readonly<{ caminho: string; id: string }>) {
  const [link, definirLink] = useState("")
  const [png, definirPng] = useState("")
  const [erroQR, falhaQR] = useState(false)
  const [aviso, informar] = useState("")
  useEffect(() => {
    let atual = true
    const url = new URL(caminho, window.location.origin).href
    definirLink(url)
    void import("qrcode").then(qr => qr.toDataURL(url, { width: 768, margin: 4, errorCorrectionLevel: "M" }))
      .then(imagem => { if (atual) definirPng(imagem) })
      .catch(() => { if (atual) falhaQR(true) })
    return () => { atual = false }
  }, [caminho])
  async function copiar() {
    try { await navigator.clipboard.writeText(link); informar("Link copiado.") }
    catch { informar("Selecione e copie o endereço no campo acima.") }
  }
  return <section className="material-edicao" aria-labelledby="titulo-material">
    <div className="imagem-qr">{png ? <img src={png} width="160" height="160" alt="QR da divulgação" />
      : <span role="status">{erroQR ? "Não foi possível gerar o QR." : "Gerando QR…"}</span>}</div>
    <div className="material-conteudo"><h2 id="titulo-material">Compartilhar divulgação</h2>
      <div className="campo"><Label htmlFor="link-divulgacao">Link da divulgação</Label>
        <Input id="link-divulgacao" value={link} readOnly onFocus={e => e.currentTarget.select()} /></div>
      <div className="botoes-material">
        {png && <Button asChild><a href={png} download={`orbcommu-${id}.png`}><Download />Baixar QR</a></Button>}
        <Button variant="outline" disabled={!link} onClick={copiar}><Copy />Copiar link</Button></div>
      {aviso && <p role="status">{aviso}</p>}
    </div>
  </section>
}

export function Encerramento({ id }: Readonly<{ id: string }>) {
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const [pendente, iniciar] = useTransition()
  const [erro, informar] = useState("")
  function concluir() {
    iniciar(async () => {
      try {
        if (await encerrar(id)) { dialogo.current?.close(); router.refresh(); return }
      } catch { /* Permite tentar novamente na mesma confirmação. */ }
      informar("Não foi possível encerrar. Tente novamente.")
    })
  }
  return <div className="encerramento-edicao">
    <Button variant="ghost" onClick={() => { informar(""); dialogo.current?.showModal() }}>Encerrar divulgação</Button>
    <dialog ref={dialogo} className="confirmar-edicao" aria-labelledby="titulo-encerrar">
      <h2 id="titulo-encerrar">Encerrar divulgação?</h2>
      <p>O link e o QR deixam de receber pedidos imediatamente. Os pedidos já recebidos continuam na fila.</p>
      <div className="botoes-material"><Button variant="outline" disabled={pendente} onClick={() => dialogo.current?.close()}>Voltar</Button>
        <Button variant="destructive" disabled={pendente} onClick={concluir}>Encerrar de vez</Button></div>
      {erro && <p role="alert">{erro}</p>}
    </dialog>
  </div>
}
