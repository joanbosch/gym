"use client"

import { Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { BodyTrendPoint, MuscleRegionStat, WeeklyTrainingPoint } from "@/types/domain"
import type { ExercisePerformance } from "@/lib/training/performance"

const loadConfig = {
  volume: { label: "Volumen (kg)", color: "var(--chart-1)" },
  sets: { label: "Series", color: "var(--chart-4)" },
} satisfies ChartConfig

export function TrainingLoadChart({ data }: { data: WeeklyTrainingPoint[] }) {
  return (
    <ChartContainer config={loadConfig} className="h-72 w-full aspect-auto">
      <ComposedChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} />
        <YAxis yAxisId="volume" tickLine={false} axisLine={false} width={44} tickFormatter={(value) => Number(value) >= 1000 ? `${Math.round(Number(value) / 1000)}k` : String(Math.round(Number(value)))} />
        <YAxis yAxisId="sets" orientation="right" tickLine={false} axisLine={false} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar yAxisId="volume" dataKey="volume" fill="var(--color-volume)" radius={[4, 4, 0, 0]} />
        <Line yAxisId="sets" type="monotone" dataKey="sets" stroke="var(--color-sets)" strokeWidth={2} dot />
      </ComposedChart>
    </ChartContainer>
  )
}

const bodyConfig = {
  weight: { label: "Peso (kg)", color: "var(--chart-1)" },
  waist: { label: "Cintura (cm)", color: "var(--chart-2)" },
  bodyFat: { label: "Grasa (%)", color: "var(--chart-4)" },
} satisfies ChartConfig

export function BodyCompositionChart({ data }: { data: BodyTrendPoint[] }) {
  return (
    <ChartContainer config={bodyConfig} className="h-72 w-full aspect-auto">
      <LineChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <YAxis yAxisId="measure" tickLine={false} axisLine={false} width={32} domain={["auto", "auto"]} />
        <YAxis yAxisId="fat" orientation="right" tickLine={false} axisLine={false} width={28} domain={["auto", "auto"]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line yAxisId="measure" type="monotone" dataKey="weight" connectNulls stroke="var(--color-weight)" strokeWidth={2} dot />
        <Line yAxisId="measure" type="monotone" dataKey="waist" connectNulls stroke="var(--color-waist)" strokeWidth={2} dot />
        <Line yAxisId="fat" type="monotone" dataKey="bodyFat" connectNulls stroke="var(--color-bodyFat)" strokeWidth={2} dot />
      </LineChart>
    </ChartContainer>
  )
}

const strengthConfig = {
  baselineE1rm: { label: "1RM inicial", color: "var(--chart-2)" },
  bestE1rm: { label: "Mejor 1RM", color: "var(--chart-1)" },
} satisfies ChartConfig

export function StrengthProgressChart({ data }: { data: ExercisePerformance[] }) {
  const chartData = data.slice(0, 6).map((item) => ({ ...item, shortName: item.name.length > 18 ? `${item.name.slice(0, 17)}…` : item.name }))
  return (
    <ChartContainer config={strengthConfig} className="h-72 w-full aspect-auto">
      <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} unit=" kg" />
        <YAxis type="category" dataKey="shortName" tickLine={false} axisLine={false} width={120} />
        <ChartTooltip content={<ChartTooltipContent labelKey="name" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="baselineE1rm" fill="var(--color-baselineE1rm)" radius={3} />
        <Bar dataKey="bestE1rm" fill="var(--color-bestE1rm)" radius={3} />
      </BarChart>
    </ChartContainer>
  )
}

const muscleConfig = { intensity: { label: "Intensidad (%)", color: "var(--chart-1)" } } satisfies ChartConfig

export function MuscleIntensityChart({ data }: { data: MuscleRegionStat[] }) {
  return (
    <ChartContainer config={muscleConfig} className="h-72 w-full aspect-auto">
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 20 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={82} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="intensity" fill="var(--color-intensity)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
