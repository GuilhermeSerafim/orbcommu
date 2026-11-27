"use client"
import { useEffect, useState } from "react"
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
  return <>
    <div className="filtros">
      <label>Pesquisar<input type="search" placeholder="Nome ou WhatsApp" autoComplete="off" value={filtro.busca}
        onChange={e => alterar({ busca: e.target.value })} /></label>
      <label>Situação<select value={filtro.situacao} onChange={e => alterar({ situacao: e.target.value as FiltroFila["situacao"] })}>
        <option>Todos</option><option>Para analisar</option>
      </select></label>
    </div>
    {!resposta && <p role="status">Carregando pedidos…</p>}
    {resposta?.erro && <div role="alert">{resposta.erro} <button onClick={() => setFiltro({ ...filtro })}>Tentar novamente</button></div>}
    {dados && <>
      <ul aria-label="Pedidos em ordem de chegada">{dados.itens.map(item => <li key={item.id}>
        <div><strong>{item.nome}</strong><span>{item.telefone}</span></div>
        <div>{item.motivacao && <p>{item.motivacao}</p>}<span>{item.origem} · <time dateTime={item.recebidoEm}>{horario.format(new Date(item.recebidoEm))}</time></span></div>
        <b>{item.situacao}</b>
      </li>)}</ul>
      {!dados.total && <p>Nenhum pedido encontrado.</p>}
    </>}
    <nav aria-label="Paginação da fila">
      <label>Pessoas por página <select value={filtro.tamanho} onChange={e => alterar({ tamanho: Number(e.target.value) as FiltroFila["tamanho"] })}>
        <option>5</option><option>10</option><option>20</option>
      </select></label>
      <span aria-live="polite">{dados && (dados.total ? `${(filtro.pagina - 1) * filtro.tamanho + 1}–${Math.min(filtro.pagina * filtro.tamanho, dados.total)} de ${dados.total}` : "0 de 0")}</span>
      <button aria-label="Página anterior" disabled={!dados || filtro.pagina === 1} onClick={() => alterar({ pagina: filtro.pagina - 1 })}>‹</button>
      <button aria-label="Próxima página" disabled={!dados || filtro.pagina * filtro.tamanho >= dados.total} onClick={() => alterar({ pagina: filtro.pagina + 1 })}>›</button>
    </nav>
  </>
}
