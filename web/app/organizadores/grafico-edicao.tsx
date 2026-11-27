"use client"

import { useEffect, useRef } from "react"
import { init, use, type ComposeOption, type EChartsType } from "echarts/core"
import { LineChart, type LineSeriesOption } from "echarts/charts"
import { GridComponent, TooltipComponent, type GridComponentOption, type TooltipComponentOption } from "echarts/components"
import { SVGRenderer } from "echarts/renderers"

use([LineChart, GridComponent, TooltipComponent, SVGRenderer])

type Opcoes = ComposeOption<LineSeriesOption | GridComponentOption | TooltipComponentOption>
type Dia = { nome: string; valor: number }

const numero = new Intl.NumberFormat("pt-BR")
const roxo = "#6652ce"
const texto = "#454456"
const grade = "#e7e5ef"

function opcoesDosDados(itens: Dia[]): Opcoes {
  return {
    grid: { left: 36, right: 22, top: 16, bottom: 30 },
    xAxis: {
      type: "category",
      data: itens.map(item => item.nome),
      boundaryGap: false,
      axisLine: { lineStyle: { color: grade } },
      axisTick: { show: false },
      axisLabel: { color: texto, hideOverlap: true, margin: 10, showMinLabel: true, showMaxLabel: true },
    },
    yAxis: {
      type: "value",
      min: 0,
      minInterval: 1,
      splitNumber: 4,
      axisLabel: { color: texto, formatter: (valor: number) => numero.format(valor) },
      splitLine: { lineStyle: { color: grade, type: "dashed" } },
    },
    series: [{
      id: "dias",
      type: "line",
      name: "Cliques",
      data: itens.map(({ nome, valor }, indice) => ({ id: String(indice), name: nome, value: valor })),
      smooth: 0.25,
      smoothMonotone: "x",
      symbol: "circle",
      symbolSize: 7,
      showAllSymbol: true,
      lineStyle: { color: roxo, width: 3 },
      itemStyle: { color: "#fff", borderColor: roxo, borderWidth: 2 },
      areaStyle: { color: roxo, opacity: 0.07 },
    }],
  }
}

export default function GraficoEdicao({ itens }: { itens: Dia[] }) {
  const elemento = useRef<HTMLDivElement>(null)
  const grafico = useRef<EChartsType | null>(null)

  useEffect(() => {
    const container = elemento.current
    if (!container) return

    const instancia = init(container, undefined, { renderer: "svg" })
    grafico.current = instancia
    const movimento = window.matchMedia("(prefers-reduced-motion: reduce)")
    const atualizarMovimento = () => instancia.setOption({ animation: !movimento.matches })
    instancia.setOption<Opcoes>({
      textStyle: { fontFamily: getComputedStyle(container).fontFamily, color: texto },
      animation: !movimento.matches,
      animationDuration: 340,
      animationDurationUpdate: 450,
      animationEasingUpdate: "cubicOut",
      tooltip: {
        trigger: "axis",
        renderMode: "richText",
        confine: true,
        transitionDuration: 0,
        backgroundColor: "#fff",
        borderColor: grade,
        textStyle: { color: texto, fontSize: 12 },
        axisPointer: {
          type: "line",
          snap: true,
          lineStyle: { color: "#aaa1d4" },
        },
        valueFormatter: valor => numero.format(Number(valor)),
      },
    })
    const observador = new ResizeObserver(() => instancia.resize())
    observador.observe(container)
    movimento.addEventListener("change", atualizarMovimento)

    return () => {
      movimento.removeEventListener("change", atualizarMovimento)
      observador.disconnect()
      instancia.dispose()
      grafico.current = null
    }
  }, [])

  useEffect(() => {
    grafico.current?.setOption<Opcoes>(opcoesDosDados(itens))
  }, [itens])

  return <div ref={elemento} aria-hidden="true" style={{ width: "100%", height: "100%" }} />
}
