"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Inbox, ListFilter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FiltroFila, ItemFila, PaginaFila } from "../../lib/fila"
import { AcoesDoPedido } from "./acoes-do-pedido"

const inicial: FiltroFila = { busca: "", situacao: "Todos", pagina: 1, tamanho: 5 }
const horario = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })

const hora = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" })

function temAcoes(item: ItemFila) {
  return ["Para analisar", "Aguardando vaga", "Chamada iniciada", "Convite enviado", "A conferir"].includes(item.situacao) && !item.encerradoEm
}

export default function Listagem({ podeOperar, situacoes }: {
  podeOperar: boolean
  situacoes: readonly FiltroFila["situacao"][]
}) {
  const [filtro, setFiltro] = useState(inicial)
  const [resultado, setResultado] = useState<{ filtro: FiltroFila; dados?: PaginaFila; erro?: string }>()
  const [revisao, setRevisao] = useState(0)
  const [retomada, setRetomada] = useState<{ id: string; reservaId: string; url?: string; filtroAnterior: FiltroFila }>()
  const focoRetomada = useRef<string | null>(null)
  const busca = useRef<HTMLInputElement>(null)
  const atualizar = useCallback(() => setRevisao(atual => atual + 1), [])
  useEffect(() => {
    function aoVoltar() {
      if (document.visibilityState === "visible") atualizar()
    }
    window.addEventListener("focus", aoVoltar)
    document.addEventListener("visibilitychange", aoVoltar)
    return () => {
      window.removeEventListener("focus", aoVoltar)
      document.removeEventListener("visibilitychange", aoVoltar)
    }
  }, [atualizar])
  useEffect(() => {
    const controlador = new AbortController()
    let prazo: ReturnType<typeof setTimeout> | undefined
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
        if (dados.atualizarEmMs != null) prazo = setTimeout(atualizar, Math.min(dados.atualizarEmMs, 2_147_483_647))
        const foco = document.activeElement
        const linhaFocada = foco?.closest<HTMLElement>("li[data-pedido-id]")
        if (linhaFocada) {
          const itemAtualizado = dados.itens.find(item => item.id === linhaFocada.dataset.pedidoId)
          if (!itemAtualizado) {
            busca.current?.focus({ preventScroll: true })
          } else if (foco?.closest(".acoes-pedido") && linhaFocada.dataset.situacao !== itemAtualizado.situacao) {
            linhaFocada.querySelector<HTMLElement>(".situacao")?.focus({ preventScroll: true })
          }
        }
        if (filtro.pagina > ultima) {
          setFiltro(atual => atual === filtro ? { ...atual, pagina: ultima } : atual)
        } else setResultado({ filtro, dados })
      } catch {
        if (!controlador.signal.aborted) setResultado({ filtro, erro: "Não foi possível carregar a fila." })
      }
    }
    void consultar()
    return () => {
      controlador.abort()
      clearTimeout(prazo)
    }
  }, [filtro, revisao, atualizar])
  const resposta = resultado?.filtro === filtro ? resultado : undefined
  const dados = resposta?.dados
  function alterar(campos: Partial<FiltroFila>) {
    setRetomada(undefined)
    focoRetomada.current = null
    setFiltro(atual => ({ busca: atual.busca, situacao: atual.situacao, tamanho: atual.tamanho, pagina: 1, ...campos }))
  }
  return <section className="lista-painel" aria-label="Consulta de pedidos">
    <div className="filtros">
      <div className="campo">
        <Label htmlFor="busca">Pesquisar</Label>
        <div className="busca"><Search aria-hidden="true" size={17} />
          <Input ref={busca} id="busca" type="search" placeholder="Nome ou WhatsApp" autoComplete="off" value={filtro.busca}
            onChange={e => alterar({ busca: e.target.value })} />
        </div>
      </div>
      <div className="campo">
        <Label htmlFor="situacao">Situação</Label>
        <div className="selecao"><select id="situacao" value={filtro.situacao} onChange={e => alterar({ situacao: e.target.value as FiltroFila["situacao"] })}>
          {situacoes.map(situacao => <option key={situacao}>{situacao}</option>)}
        </select><ChevronDown aria-hidden="true" size={16} /></div>
      </div>
    </div>
    {retomada && filtro.pedidoId === retomada.id && <Button variant="outline" type="button" onClick={() => {
      setFiltro(retomada.filtroAnterior)
      setRetomada(undefined)
      focoRetomada.current = null
      busca.current?.focus()
    }}>Voltar para Aguardando vaga</Button>}
    {!resposta && <p className="lista-estado" role="status">Carregando pedidos…</p>}
    {resposta?.erro && <div className="lista-estado" role="alert"><p>{resposta.erro}</p>
      <Button variant="outline" onClick={() => setFiltro({ ...filtro })}>Tentar novamente</Button></div>}
    {dados && <>
      {dados.total > 0 ? <>
        <div className="lista-colunas" aria-hidden="true"><span>Participante</span><span>Origem e recebimento</span><span>Situação</span></div>
        <ul aria-label="Pedidos em ordem de chegada" className="pedidos">{dados.itens.map(item => <li key={item.id} data-pedido-id={item.id} data-situacao={item.situacao}
          ref={linha => {
            if (!linha || focoRetomada.current !== item.reservaId || !item.reservaId) return
            focoRetomada.current = null
            if (document.activeElement === document.body) {
              const alvo = linha.querySelector<HTMLElement>(".aviso-acao a") ?? linha.querySelector<HTMLElement>(".situacao")
              alvo?.focus()
            }
          }}>
          <div className="pessoa"><strong>{item.nome}</strong><span>{item.telefone.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, "+55 ($1) $2-$3")}</span>
            {item.motivacao && <p className="motivacao">{item.motivacao}</p>}</div>
          <div className="origem"><span>{item.origem}</span><time dateTime={item.recebidoEm}>{horario.format(new Date(item.recebidoEm))}</time></div>
          <span className="situacao" tabIndex={-1}>{item.situacao}</span>
          {(item.conversadoEm || item.aprovadoEm || item.encerradoPorNome || item.enviadoEm) && <div className="historico-vistoria" aria-live="polite">
            {item.conversadoEm && <p>{item.conversadoPorNome} abriu o WhatsApp às{" "}
              <time dateTime={item.conversadoEm} title={horario.format(new Date(item.conversadoEm))}>{hora.format(new Date(item.conversadoEm))}</time></p>}
            {item.aprovadoEm && <p>{item.aprovadoPorNome} aprovou em{" "}
              <time dateTime={item.aprovadoEm}>{horario.format(new Date(item.aprovadoEm))}</time></p>}
            {item.enviadoEm && <p>Enviado por {item.enviadoPorNome} em{" "}
              <time dateTime={item.enviadoEm}>{horario.format(new Date(item.enviadoEm))}</time></p>}
            {item.encerradoEm && item.encerradoPorNome && <p>{item.encerradoPorNome} encerrou o pedido em{" "}
              <time dateTime={item.encerradoEm}>{horario.format(new Date(item.encerradoEm))}</time></p>}
          </div>}
          {podeOperar && temAcoes(item)
            && <AcoesDoPedido id={item.id} situacao={item.situacao} reservaId={item.reservaId} atualizar={atualizar}
              alternativaInicial={retomada?.id === item.id && retomada.reservaId === item.reservaId && retomada.url
                ? { url: retomada.url, reservaId: retomada.reservaId } : undefined}
              aoChamar={(reservaId, alternativa) => {
                if (filtro.situacao !== "Aguardando vaga") return
                focoRetomada.current = reservaId
                setRetomada({ id: item.id, reservaId, url: alternativa?.url, filtroAnterior: filtro })
                setFiltro(atual => atual === filtro ? { ...atual, situacao: "Todos", pedidoId: item.id, busca: item.telefone, pagina: 1 } : atual)
              }} />}
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
