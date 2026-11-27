"use client"

import { useEffect, useRef } from "react"
import { init, use, type ComposeOption, type EChartsType } from "echarts/core"
import { BarChart, LineChart, type BarSeriesOption, type LineSeriesOption } from "echarts/charts"
import { GridComponent, TooltipComponent, type GridComponentOption, type TooltipComponentOption } from "echarts/components"
import { SVGRenderer } from "echarts/renderers"

use([BarChart, LineChart, GridComponent, TooltipComponent, SVGRenderer])

type Opcoes = ComposeOption<BarSeriesOption | LineSeriesOption | GridComponentOption | TooltipComponentOption>
type Props = { tipo: "origens" | "dias"; itens: { nome: string; valor: number }[] }

const numero = new Intl.NumberFormat("pt-BR")
const roxo = "#6652ce"
const texto = "#454456"
const grade = "#e7e5ef"

function opcoesDosDados({ tipo, itens }: Props): Opcoes {
  const nomes = itens.map(item => item.nome)
  const eixoDeContagem = {
    type: "value" as const,
    min: 0,
    minInterval: 1,
    splitNumber: 4,
    axisLabel: { color: texto, formatter: (valor: number) => numero.format(valor) },
    splitLine: { lineStyle: { color: grade, type: "dashed" as const } },
  }

  if (tipo === "origens") {
    const digitos = Math.max(1, ...itens.map(item => numero.format(item.valor).length))
    return {
      grid: { left: 112, right: 14 + digitos * 8, top: 6, bottom: 6 },
      xAxis: { ...eixoDeContagem, show: false },
      yAxis: {
        type: "category",
        data: nomes,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { interval: 0, color: texto, width: 100, overflow: "break", lineHeight: 16, margin: 10 },
      },
      series: [{
        id: "origens",
        type: "bar",
        name: "Aberturas",
        data: itens.map(({ nome, valor }) => ({ name: nome, value: valor })),
        barMaxWidth: 17,
        itemStyle: { color: roxo, borderRadius: [0, 4, 4, 0] },
        label: {
          show: true, position: "right", distance: 6, color: texto, fontWeight: 600,
          formatter: ponto => numero.format(Number(ponto.value)),
        },
      }],
    }
  }

  return {
    grid: { left: 36, right: 22, top: 16, bottom: 30 },
    xAxis: {
      type: "category",
      data: nomes,
      boundaryGap: false,
      axisLine: { lineStyle: { color: grade } },
      axisTick: { show: false },
      axisLabel: { color: texto, hideOverlap: true, margin: 10, showMinLabel: true, showMaxLabel: true },
    },
    yAxis: eixoDeContagem,
    series: [{
      id: "dias",
      type: "line",
      name: "Aberturas",
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

export default function GraficoEdicao({ tipo, itens }: Props) {
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
          type: tipo === "origens" ? "shadow" : "line",
          snap: true,
          shadowStyle: { color: "rgba(102, 82, 206, 0.06)" },
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
  }, [tipo])

  useEffect(() => {
    grafico.current?.setOption<Opcoes>(opcoesDosDados({ tipo, itens }))
  }, [tipo, itens])

  return <div ref={elemento} aria-hidden="true" style={{ width: "100%", height: "100%" }} />
}
