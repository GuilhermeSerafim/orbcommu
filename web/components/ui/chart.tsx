"use client"

import type { CSSProperties, ReactElement } from "react"
import { ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"

type ChartConfig = Record<string, { label: string; color: string }>

// ChartContainer do shadcn/ui, com as cores aplicadas apenas ao próprio gráfico.
export function ChartContainer({ config, className, children }: Readonly<{
  config: ChartConfig
  className?: string
  children: ReactElement
}>) {
  const cores = Object.fromEntries(Object.entries(config).map(([serie, item]) => [`--color-${serie}`, item.color]))
  return <div data-slot="chart" className={cn("text-xs", className)} style={cores as CSSProperties}>
    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 180 }}>
      {children}
    </ResponsiveContainer>
  </div>
}

export const ChartTooltip = Tooltip
