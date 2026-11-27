"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import type { ResultadoDivulgacao } from "@/lib/divulgacoes"
import { mostrarDia } from "@/lib/periodo-divulgacao"

const config = { aberturas: { label: "Aberturas", color: "var(--violeta)" } }

export default function Resultados({ dados }: Readonly<{ dados: ResultadoDivulgacao }>) {
  const router = useRouter()
  const [atualizando, atualizar] = useTransition()
  const { aberturas, solicitantes, confirmados } = dados
  const percentual = solicitantes ? Math.round(confirmados * 100 / solicitantes) : null
  const dias = dados.dias.slice(-14).map(d => ({ ...d, data: mostrarDia(d.dia) }))
  return <section className="resultados-edicao" aria-labelledby="titulo-resultados">
    <div className="linha-resultados"><h2 id="titulo-resultados">Resultados da divulgação</h2>
      <Button variant="ghost" disabled={atualizando} onClick={() => atualizar(() => router.refresh())}><RefreshCw />Atualizar</Button></div>
    <dl className="metricas-edicao">
      <div><dt>Aberturas do link ou QR</dt><dd>{aberturas}</dd></div>
      <div><dt>Pessoas que pediram entrada</dt><dd>{solicitantes}</dd></div>
      <div><dt>Entradas confirmadas</dt><dd>{confirmados}</dd></div>
    </dl>
    <div className="graficos-edicao">
      <section className="grafico-edicao"><h3>Aberturas por dia</h3>
        {dias.length ? <ChartContainer config={config} className="chart-aberturas">
          <BarChart data={dias} accessibilityLayer margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--linha)" />
            <XAxis dataKey="data" tickFormatter={data => String(data).slice(0, 5)} tickLine={false} axisLine={false} minTickGap={18} />
            <YAxis allowDecimals={false} width={30} tickLine={false} axisLine={false} />
            <ChartTooltip formatter={valor => [valor, "Aberturas"]} />
            <Bar dataKey="aberturas" fill="var(--color-aberturas)" maxBarSize={40} radius={[4,4,0,0]} isAnimationActive={false} />
          </BarChart></ChartContainer> :
          <p className="grafico-vazio">Os dias aparecem conforme o público abre o link ou o QR.</p>}
      </section>
      <section className="grafico-edicao"><h3>Entrada na comunidade</h3>
        {percentual === null ? <p className="grafico-vazio">O percentual aparece com o primeiro pedido desta edição.</p> : <>
          <strong className="taxa-edicao">{percentual}%</strong>
          <progress aria-label="Taxa de entrada confirmada" value={confirmados} max={solicitantes} />
          <p>{confirmados} de {solicitantes} {solicitantes === 1 ? "pessoa" : "pessoas"} com entrada confirmada</p></>}
      </section>
    </div>
  </section>
}
