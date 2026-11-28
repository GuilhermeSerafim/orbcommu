"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Inbox, ListFilter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FiltroFila, ItemFila, PaginaFila } from "../../lib/fila"
import { SeloSituacao } from "./selo-situacao"
import { AcoesDoPedido } from "./acoes-do-pedido"
import { useAbaWhatsApp } from "./aba-whatsapp"
import ResumoPainel from "./resumo-painel"

const inicial: FiltroFila = { busca: "", situacao: "Todos", pagina: 1, tamanho: 5 }
const horario = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })

const hora = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" })

function temAcoes(item: ItemFila) {
  return ["Para analisar", "Aguardando vaga", "Chamada iniciada", "Convite enviado", "A conferir"].includes(item.situacao) && !item.encerradoEm
}

export default function Listagem({ podeOperar, situacoes, api = "/api/fila", configuracao }: {
  podeOperar: boolean
  situacoes: readonly FiltroFila["situacao"][]
  api?: string
  configuracao?: React.ReactNode
}) {
  const [filtro, setFiltro] = useState(inicial)
  const [resultado, setResultado] = useState<{ filtro: FiltroFila; dados?: PaginaFila; erro?: string }>()
  const [revisao, setRevisao] = useState(0)
  const [acessoRecusado, recusarAcesso] = useState(false)
  const chamadasNaPagina = useRef<string[]>([])
  const busca = useRef<HTMLInputElement>(null)
  const tituloPedidos = useRef<HTMLHeadingElement>(null)
  const abaWhatsApp = useAbaWhatsApp()
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
      const chamadas = chamadasNaPagina.current
      for (const id of chamadas) parametros.append("chamada", id)
      try {
        const res = await fetch(api + "?" + parametros, { cache: "no-store", signal: controlador.signal })
        if (!res.ok) {
          if (!controlador.signal.aborted && (res.status === 401 || res.status === 403)) recusarAcesso(true)
          if (!controlador.signal.aborted) setResultado({ filtro, erro: [401,403].includes(res.status)
            ? "Esta sessão não tem acesso à fila." : "Não foi possível carregar a fila." })
          return
        }
        const dados: PaginaFila = await res.json()
        const ultima = Math.max(1, Math.ceil(dados.total / filtro.tamanho))
        if (controlador.signal.aborted || chamadas !== chamadasNaPagina.current) return
        recusarAcesso(false)
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
  }, [api, filtro, revisao, atualizar])
  const resposta = resultado?.filtro === filtro ? resultado : undefined
  const dados = resposta?.dados
  function alterar(campos: Partial<FiltroFila>) {
    chamadasNaPagina.current = []
    setFiltro(atual => ({ busca: atual.busca, situacao: atual.situacao, tamanho: atual.tamanho, pagina: 1, ...campos }))
  }
  function manterChamadaNaPagina(id: string) {
    if (filtro.situacao !== "Aguardando vaga" || !dados) return
    chamadasNaPagina.current = dados.itens
      .filter(item => item.id === id || chamadasNaPagina.current.includes(item.id))
      .map(item => item.id)
  }
  return <>
    {!acessoRecusado && <ResumoPainel api={api} revisao={revisao} situacao={filtro.situacao} selecionar={situacao => {
      alterar({ situacao, busca: "" })
      tituloPedidos.current?.focus({ preventScroll: true })
      tituloPedidos.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
    }} />}
    <div className="cabecalho-pedidos"><h2 tabIndex={-1} ref={tituloPedidos}>Pedidos da fila</h2>
      {configuracao}</div>
    <section id="pedidos-da-fila" className="lista-painel" aria-label="Consulta de pedidos">
    {/* A aba externa tem como opener um quadro vazio sem permissão para executar scripts. */}
    {podeOperar && <iframe ref={abaWhatsApp.origem} title="Abertura do WhatsApp" hidden
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" />}
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
    {!resposta && <p className="lista-estado" role="status">Carregando pedidos…</p>}
    {resposta?.erro && <div className="lista-estado" role="alert"><p>{resposta.erro}</p>
      <Button variant="outline" onClick={() => setFiltro({ ...filtro })}>Tentar novamente</Button></div>}
    {dados && <>
      {dados.total > 0 ? <>
        <div className="lista-colunas" aria-hidden="true"><span>Participante</span><span>Origem e recebimento</span><span>Situação</span></div>
        <ul aria-label="Pedidos em ordem de chegada" className="pedidos">{dados.itens.map(item => <li key={item.id} data-pedido-id={item.id} data-situacao={item.situacao}>
          <div className="pessoa"><strong>{item.nome}</strong><span>{item.telefone.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, "+55 ($1) $2-$3")}</span>
            {item.motivacao && <p className="motivacao">{item.motivacao}</p>}</div>
          <div className="origem"><span>{item.origem}</span><time dateTime={item.recebidoEm}>{horario.format(new Date(item.recebidoEm))}</time></div>
          <SeloSituacao situacao={item.situacao} />
          {(item.situacao === "Convite enviado" || item.situacao === "Prazo encerrado")
            ? <div className="historico-vistoria" aria-live="polite">Enviado por {item.enviadoPorNome}</div>
            : (item.conversadoEm || item.aprovadoEm || item.encerradoPorNome || item.enviadoEm) && <div className="historico-vistoria" aria-live="polite">
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
              prepararAba={abaWhatsApp.preparar} aoIniciarChamada={() => manterChamadaNaPagina(item.id)} />}
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
  </section></>
}
