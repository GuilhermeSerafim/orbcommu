"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, QrCode } from "lucide-react"
import { DayPicker, type DateRange } from "react-day-picker"
import { ptBR } from "react-day-picker/locale"
import "react-day-picker/style.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { mostrarDia } from "@/lib/periodo-divulgacao"
import { criar } from "../acoes"

function diaLocal(data?: Date) {
  if (!data) return ""
  return [String(data.getFullYear()), String(data.getMonth() + 1).padStart(2,"0"), String(data.getDate()).padStart(2,"0")].join("-")
}

export default function CriarDivulgacao({ id, hoje }: Readonly<{ id: string; hoje: string }>) {
  const router = useRouter()
  const [periodo, selecionar] = useState<DateRange>()
  const [aberto, abrir] = useState(false)
  const [erro, informar] = useState("")
  const [pendente, iniciar] = useTransition()
  const primeiro = diaLocal(periodo?.from)
  const ultimo = diaLocal(periodo?.to || periodo?.from)
  const dataHoje = new Date(hoje + "T12:00:00")
  let rotulo = "Selecionar período"
  if (primeiro) rotulo = primeiro === ultimo ? mostrarDia(primeiro) : mostrarDia(primeiro) + " — " + mostrarDia(ultimo)
  return <form className="formulario criar-divulgacao" onSubmit={e => {
    e.preventDefault()
    const nome = String(new FormData(e.currentTarget).get("nome") || "")
    if (!primeiro) { informar("Selecione o período da divulgação."); abrir(true); return }
    informar("")
    iniciar(async () => {
      try {
        const mensagem = await criar(id, nome, primeiro, ultimo)
        if (mensagem) informar(mensagem)
        else router.replace("/fila/divulgacoes/" + id)
      } catch { informar("Não foi possível gerar a divulgação. Tente novamente.") }
    })
  }}>
    <div className="campo"><Label htmlFor="evento-nome">Nome do evento</Label>
      <Input id="evento-nome" name="nome" placeholder="Ex.: Workshop de IA" required maxLength={100} /></div>
    <div className="campo"><Label id="periodo-label" htmlFor="periodo">Período da divulgação</Label>
      <Button id="periodo" type="button" variant="outline" aria-labelledby="periodo-label" aria-describedby="valor-periodo" aria-expanded={aberto}
        onClick={() => abrir(!aberto)}><CalendarDays /><span id="valor-periodo">{rotulo}</span></Button>
      {aberto && <div className="calendario-edicao"><DayPicker mode="range" locale={ptBR} today={dataHoje}
        selected={periodo} onSelect={selecionar} defaultMonth={periodo?.from || dataHoje} startMonth={dataHoje} disabled={{ before: dataHoje }} />
        <Button type="button" variant="outline" disabled={!primeiro} onClick={() => abrir(false)}>Aplicar período</Button></div>}
      <small>Datas de São Paulo, incluindo o último dia.</small></div>
    {erro && <p className="aviso-erro" role="alert">{erro}</p>}
    <Button type="submit" disabled={pendente}><QrCode />{pendente ? "Gerando…" : "Gerar link e QR"}</Button>
  </form>
}
