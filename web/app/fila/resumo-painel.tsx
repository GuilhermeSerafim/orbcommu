"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, ClipboardList, Clock3, ScanEye, Send } from "lucide-react"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { Tabs } from "radix-ui"
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import CountUp from "@/components/ui/count-up"
import type { FiltroFila } from "@/lib/fila"
import type { ResumoFila } from "@/lib/painel-fila"
import estilos from "./resumo-painel.module.css"

const indicadores = [
  { chave: "paraAnalisar", titulo: "Para analisar", detalhe: "Pedidos para avaliar", icone: ClipboardList },
  { chave: "aguardandoVaga", titulo: "Aguardando vaga", detalhe: "Aprovados para chamar", icone: Clock3 },
  { chave: "chamadaIniciada", titulo: "Envio a confirmar", detalhe: "Chamadas iniciadas", icone: Send },
  { chave: "aConferir", titulo: "A conferir", detalhe: "Convites há 24h ou mais", icone: ScanEye },
] as const

function espera(ms: number) {
  const minutos = Math.floor(ms / 60_000)
  if (minutos < 1) return "Menos de 1 min de espera"
  const duracao = minutos < 60 ? minutos + " min" : minutos < 1440 ? Math.floor(minutos / 60) + " h" : Math.floor(minutos / 1440) + " d"
  return "Mais antigo há " + duracao
}

const config = { valor: { label: "Pedidos", color: "#6856cb" } }

export default function ResumoPainel({ api, revisao, situacao, selecionar }: {
  api: string
  revisao: number
  situacao: FiltroFila["situacao"]
  selecionar: (filtro: FiltroFila["situacao"]) => void
}) {
  const [dias, definirDias] = useState<7 | 30>(7)
  const [resumo, definirResumo] = useState<ResumoFila | null>(null)
  const [erro, definirErro] = useState(false)
  const [consulta, reconsultar] = useState(0)
  const [destaque, destacar] = useState<string | null>(null)
  const menosMovimento = useReducedMotion()

  useEffect(() => {
    const controlador = new AbortController()
    let proxima: ReturnType<typeof setTimeout>
    async function carregar() {
      try {
        const resposta = await fetch(api + "/resumo?dias=" + dias, { signal: controlador.signal, cache: "no-store" })
        if (!resposta.ok) throw new Error("Resumo indisponível")
        const dados: ResumoFila = await resposta.json()
        if (controlador.signal.aborted) return
        definirErro(false)
        definirResumo(dados)
        // Atualiza também o tempo de espera e a virada do dia com a tela aberta.
        proxima = setTimeout(carregar, Math.max(250, Math.min(60_000, dados.atualizarEmMs ?? 60_000)))
      } catch {
        if (!controlador.signal.aborted) {
          definirResumo(null)
          definirErro(true)
        }
      }
    }
    void carregar()
    return () => { controlador.abort(); clearTimeout(proxima) }
  }, [api, dias, revisao, consulta])

  const atuais = resumo?.atuais
  const funil = resumo?.dias === dias ? resumo.funil : null
  const etapas = funil ? [
    { nome: "Recebidos", valor: funil.recebidos, fill: "#cbc2ee" },
    { nome: "Aprovados", valor: funil.aprovados, fill: "#a99adb" },
    { nome: "Convites enviados", valor: funil.convitesEnviados, fill: "#8473ca" },
    { nome: "Entradas confirmadas", valor: funil.entradasConfirmadas, fill: "#5543b6" },
  ] : []
  if (erro) return <div className={estilos.falha} role="status">Não foi possível carregar os indicadores.
    <Button variant="outline" onClick={() => reconsultar(n => n + 1)}>Tentar carregar indicadores</Button></div>

  return <div className={estilos.painel}>
    <section aria-labelledby="titulo-pendencias">
      <h2 id="titulo-pendencias" className={estilos.subtitulo}>Pendências da fila</h2>
      <LayoutGroup id="indicadores-fila">
        <div className={estilos.cartoes} onPointerLeave={() => destacar(null)}>
          {indicadores.map(({ titulo, chave, detalhe, icone: Icone }) => {
            const valor = atuais?.[chave]
            const prioritaria = chave === "aConferir" && Boolean(valor)
            const legenda = chave === "paraAnalisar" && atuais?.esperaMaisAntigaMs != null ? espera(atuais.esperaMaisAntigaMs) : detalhe
            return <Card key={chave} className={estilos.cartao} data-prioritario={prioritaria} data-selecionado={situacao === titulo}>
              <button type="button" className={estilos.atalho} aria-pressed={situacao === titulo} aria-controls="pedidos-da-fila"
                aria-label={titulo + (valor == null ? "" : ", " + valor) + ". " + legenda}
                onClick={() => selecionar(titulo)} onPointerEnter={e => { if (e.pointerType !== "touch") destacar(chave) }}
                onFocus={() => destacar(chave)} onBlur={() => destacar(null)}>
                {destaque === chave && <motion.span aria-hidden="true" className={estilos.realce}
                  layoutId={menosMovimento ? undefined : "realce-cartao"} transition={{ duration: menosMovimento ? 0 : .18 }} />}
                <span className={estilos.cabecalhoCartao}><Icone size={17} aria-hidden="true" />{titulo}<ArrowUpRight size={16} aria-hidden="true" /></span>
                <strong aria-hidden="true" className={estilos.contador}>{valor == null ? "—" : <CountUp to={valor} startWhen reducedMotion={Boolean(menosMovimento)} />}</strong>
                <span className={estilos.legenda}>{legenda}</span>
              </button>
            </Card>
          })}
        </div>
      </LayoutGroup>
    </section>
    <Card className={estilos.resultado}>
      <section className={estilos.leitura} aria-labelledby="titulo-conversao">
        <h2 id="titulo-conversao">Quantos pedidos viraram entrada?</h2>
        <strong className={estilos.percentual}>{funil?.recebidos ? Math.round(100 * funil.entradasConfirmadas / funil.recebidos) + "%" : "—"}</strong>
        <p aria-live="polite">{!funil ? "Carregando resultados…" : !funil.recebidos ? "Nenhum pedido recebido no período." :
          <><b>{funil.entradasConfirmadas} de {funil.recebidos}</b> {funil.recebidos === 1 ? "pedido com entrada confirmada." : "pedidos com entrada confirmada."}</>}</p>
      </section>
      <section className={estilos.grafico} aria-labelledby="titulo-etapas">
        <h3 id="titulo-etapas" className="sr-only">Resultados dos pedidos</h3>
        <Tabs.Root defaultValue="etapas">
        <div className={estilos.cabecalhoGrafico}>
          <Tabs.List className={estilos.abas} aria-label="Gráfico de resultados">
            <Tabs.Trigger value="etapas">Etapas da fila</Tabs.Trigger>
            <Tabs.Trigger value="origens">Por divulgação</Tabs.Trigger>
          </Tabs.List>
          <div className={estilos.periodos} role="group" aria-label="Período de recebimento">
            {([7, 30] as const).map(n => <Button type="button" size="sm" variant="ghost" key={n}
              aria-pressed={dias === n} onClick={() => definirDias(n)}>{n} dias</Button>)}
          </div>
        </div>
        <p className={estilos.periodo}>Pedidos recebidos nos últimos {dias} dias</p>
        <Tabs.Content value="etapas">
        {funil ? <>
          <div aria-hidden="true"><ChartContainer config={config} className={estilos.barras}>
            <BarChart layout="vertical" data={etapas} barSize={13} margin={{ left: 0, right: 38, top: 3, bottom: 0 }} accessibilityLayer={false}>
              <XAxis type="number" hide domain={[0, Math.max(1, funil.recebidos)]} />
              <YAxis type="category" dataKey="nome" axisLine={false} tickLine={false} width={140} interval={0}
                tick={({ x, y, payload }) => <text x={Number(x) - 6} y={y} dy=".35em" textAnchor="end" fill="#4b465b" fontSize={12}>{payload.value}</text>} />
              <Bar dataKey="valor" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                <LabelList dataKey="valor" position="right" fill="#302844" fontSize={13} fontWeight={700} />
              </Bar>
            </BarChart>
          </ChartContainer></div>
          <dl className="sr-only">{etapas.map(etapa => <div key={etapa.nome}><dt>{etapa.nome}</dt><dd>{etapa.valor}</dd></div>)}</dl>
        </> : <div className={estilos.barras} />}
        </Tabs.Content>
        <Tabs.Content value="origens">
          {!funil ? <div className={estilos.barras} /> : !resumo?.divulgacoes.length ?
            <p className={estilos.vazio}>As origens aparecem com o primeiro pedido do período.</p> : <>
            <p className={estilos.tituloOrigens}>Entradas confirmadas por origem</p>
            <div className={estilos.origens}>
              {resumo.divulgacoes.slice(0, 5).map(origem => <div className={estilos.origem} key={origem.nome}>
                <span>{origem.nome}</span>
                <span><b>{origem.entradasConfirmadas}</b> de {origem.pedidos} {origem.pedidos === 1 ? "pedido" : "pedidos"}</span>
                <span className={estilos.trilho} aria-hidden="true"><i style={{ width: (100 * origem.entradasConfirmadas / Math.max(1, resumo.divulgacoes[0].entradasConfirmadas)) + "%" }} /></span>
              </div>)}
            </div></>}
        </Tabs.Content>
        </Tabs.Root>
      </section>
    </Card>
  </div>
}
