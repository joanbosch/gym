"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { BodyTrendPoint } from "@/types/domain"

const config = {
  weight: { label: "Peso (kg)", color: "var(--chart-1)" },
  waist: { label: "Cintura (cm)", color: "var(--chart-2)" },
} satisfies ChartConfig

export function ProgressChart({ data }: { data: BodyTrendPoint[] }) {
  return (
    <ChartContainer config={config} className="min-h-64 w-full aspect-auto">
      <LineChart accessibilityLayer data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <YAxis hide domain={["auto", "auto"]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="weight" stroke="var(--color-weight)" strokeWidth={2} dot />
        <Line type="monotone" dataKey="waist" stroke="var(--color-waist)" strokeWidth={2} dot />
      </LineChart>
    </ChartContainer>
  )
}
