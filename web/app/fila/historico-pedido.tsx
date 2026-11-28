"use client"

import { History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { ItemFila } from "@/lib/fila"

const fuso = "America/Sao_Paulo"
const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, dateStyle: "long" })
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, timeStyle: "short" })

function Movimentacoes({ item }: { item: ItemFila }) {
  const eventos = [
    { em: item.encerradoEm, acao: "Pedido encerrado", por: item.encerradoPorNome },
    { em: item.enviadoEm, acao: "Convite enviado", por: item.enviadoPorNome },
    { em: item.aprovadoEm, acao: "Pedido aprovado", por: item.aprovadoPorNome },
    { em: item.conversadoEm, acao: "Conversa aberta no WhatsApp", por: item.conversadoPorNome },
    { em: item.recebidoEm, acao: "Pedido recebido", por: null },
  ].flatMap(evento => evento.em ? [{ ...evento, instante: new Date(evento.em) }] : [])
    .sort((a, b) => b.instante.getTime() - a.instante.getTime())
  const dias = new Map<string, typeof eventos>()
  for (const evento of eventos) {
    const data = dia.format(evento.instante)
    const grupo = dias.get(data)
    if (grupo) grupo.push(evento)
    else dias.set(data, [evento])
  }
  return <>{Array.from(dias, ([data, registros]) => <section key={data} className="dia-historico">
    <h3>{data}</h3>
    <ol>{registros.map(({ acao, por, instante }) => <li key={acao}>
      <time dateTime={instante.toISOString()}>{hora.format(instante)}</time>
      <div><strong>{acao}</strong>{por && <span>{por}</span>}</div>
    </li>)}</ol>
  </section>)}</>
}

export function HistoricoPedido({ item }: { item: ItemFila }) {
  return <Dialog>
    <DialogTrigger asChild>
      <Button type="button" variant="ghost" size="sm" className="abrir-historico" aria-label={`Histórico de ${item.nome}`}>
        <History aria-hidden="true" />Histórico
      </Button>
    </DialogTrigger>
    <DialogContent className="historico-pedido">
      <DialogTitle>Histórico de {item.nome}</DialogTitle>
      <DialogDescription>Horários de São Paulo</DialogDescription>
      <Movimentacoes item={item} />
    </DialogContent>
  </Dialog>
}
