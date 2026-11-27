"use client"
import { useEffect, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Inbox, ListFilter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FiltroFila, PaginaFila } from "../../lib/fila"

const inicial: FiltroFila = { busca: "", situacao: "Todos", pagina: 1, tamanho: 5 }
const horario = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })

export default function Listagem() {
  const [filtro, setFiltro] = useState(inicial)
  const [resultado, setResultado] = useState<{ filtro: FiltroFila; dados?: PaginaFila; erro?: string }>()
  useEffect(() => {
    const controlador = new AbortController()
    async function consultar() {
      const parametros = new URLSearchParams({ ...filtro, pagina: String(filtro.pagina), tamanho: String(filtro.tamanho) })
      try {
        const res = await fetch("/api/fila?" + parametros, { cache: "no-store", signal: controlador.signal })
        if (!res.ok) {
          if (!controlador.signal.aborted) setResultado({ filtro, erro: [401,403].includes(res.status)
            ? "Esta sessão não tem acesso à fila." : "Não foi possível carregar a fila." })
          return
        }
        const dados: PaginaFila = await res.json()
        const ultima = Math.max(1, Math.ceil(dados.total / filtro.tamanho))
        if (controlador.signal.aborted) return
        if (filtro.pagina > ultima) {
          setFiltro(atual => atual === filtro ? { ...atual, pagina: ultima } : atual)
        } else setResultado({ filtro, dados })
      } catch {
        if (!controlador.signal.aborted) setResultado({ filtro, erro: "Não foi possível carregar a fila." })
      }
    }
    void consultar()
    return () => controlador.abort()
  }, [filtro])
  const resposta = resultado?.filtro === filtro ? resultado : undefined
  const dados = resposta?.dados
  function alterar(campos: Partial<FiltroFila>) {
    setFiltro(atual => ({ ...atual, pagina: 1, ...campos }))
  }
  return <section className="lista-painel" aria-label="Consulta de pedidos">
    <div className="filtros">
      <div className="campo">
        <Label htmlFor="busca">Pesquisar</Label>
        <div className="busca"><Search aria-hidden="true" size={17} />
          <Input id="busca" type="search" placeholder="Nome ou WhatsApp" autoComplete="off" value={filtro.busca}
            onChange={e => alterar({ busca: e.target.value })} />
        </div>
      </div>
      <div className="campo">
        <Label htmlFor="situacao">Situação</Label>
        <div className="selecao"><select id="situacao" value={filtro.situacao} onChange={e => alterar({ situacao: e.target.value as FiltroFila["situacao"] })}>
          <option>Todos</option><option>Para analisar</option>
        </select><ChevronDown aria-hidden="true" size={16} /></div>
      </div>
    </div>
    {!resposta && <p className="lista-estado" role="status">Carregando pedidos…</p>}
    {resposta?.erro && <div className="lista-estado" role="alert"><p>{resposta.erro}</p>
      <Button variant="outline" onClick={() => setFiltro({ ...filtro })}>Tentar novamente</Button></div>}
    {dados && <>
      {dados.total > 0 ? <>
        <div className="lista-colunas" aria-hidden="true"><span>Participante</span><span>Origem e recebimento</span><span>Situação</span></div>
        <ul aria-label="Pedidos em ordem de chegada" className="pedidos">{dados.itens.map(item => <li key={item.id}>
          <div className="pessoa"><strong>{item.nome}</strong><span>{item.telefone.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, "+55 ($1) $2-$3")}</span>
            {item.motivacao && <p className="motivacao">{item.motivacao}</p>}</div>
          <div className="origem"><span>{item.origem}</span><time dateTime={item.recebidoEm}>{horario.format(new Date(item.recebidoEm))}</time></div>
          <span className="situacao">{item.situacao}</span>
        </li>)}</ul>
      </> : <div className="lista-estado">
        {filtro.busca || filtro.situacao !== "Todos" ? <ListFilter aria-hidden="true" /> : <Inbox aria-hidden="true" />}
        <strong>Nenhum pedido encontrado.</strong>
        <p>{filtro.busca || filtro.situacao !== "Todos" ? "Tente outro nome ou WhatsApp, ou altere a situação." : "Os pedidos enviados pelo formulário aparecerão aqui."}</p>
      </div>}
    </>}
    <nav className="paginacao" aria-label="Paginação da fila">
      <label htmlFor="tamanho">Pessoas por página</label><div className="selecao"><select id="tamanho" value={filtro.tamanho} onChange={e => alterar({ tamanho: Number(e.target.value) as FiltroFila["tamanho"] })}>
        <option>5</option><option>10</option><option>20</option>
      </select><ChevronDown aria-hidden="true" size={14} /></div>
      <div className="paginas"><span aria-live="polite">{dados && (dados.total ? `${(filtro.pagina - 1) * filtro.tamanho + 1}–${Math.min(filtro.pagina * filtro.tamanho, dados.total)} de ${dados.total}` : "0 de 0")}</span>
      <Button variant="ghost" size="icon" aria-label="Página anterior" disabled={!dados || filtro.pagina === 1} onClick={() => alterar({ pagina: filtro.pagina - 1 })}><ChevronLeft aria-hidden="true" /></Button>
      <Button variant="ghost" size="icon" aria-label="Próxima página" disabled={!dados || filtro.pagina * filtro.tamanho >= dados.total} onClick={() => alterar({ pagina: filtro.pagina + 1 })}><ChevronRight aria-hidden="true" /></Button>
      </div>
    </nav>
  </section>
}
