"use client"

import { useMemo, useRef, useState } from "react"
import type { CSSProperties, FocusEvent, PointerEvent } from "react"
import { Badge } from "@/components/ui/badge"
import type { MuscleRegionKey, MuscleRegionStat } from "@/types/domain"

type HoverState = { stat: MuscleRegionStat; x: number; y: number; flip: boolean }

function fillFor(stat: MuscleRegionStat) {
  if (!stat.trained) return "var(--muted)"
  if (stat.intensity < 40) return "var(--chart-3)"
  if (stat.intensity < 65) return "var(--chart-2)"
  if (stat.intensity < 85) return "var(--chart-1)"
  return "var(--chart-4)"
}

function MuscleShape({ d, stat, center, setHover }: { d: string; stat: MuscleRegionStat; center: [number, number]; setHover: (value: HoverState | null) => void }) {
  const style = { "--muscle-fill": fillFor(stat) } as CSSProperties
  const showAtPointer = (event: PointerEvent<SVGPathElement>) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!bounds) return
    setHover({ stat, x: event.clientX - bounds.left, y: event.clientY - bounds.top, flip: event.clientX - bounds.left > bounds.width * 0.58 })
  }
  const showAtFocus = (event: FocusEvent<SVGPathElement>) => {
    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return
    const bounds = svg.getBoundingClientRect()
    setHover({ stat, x: center[0] / 520 * bounds.width, y: center[1] / 500 * bounds.height, flip: center[0] > 300 })
  }
  return <path d={d} tabIndex={0} role="button" aria-label={`${stat.name}: ${stat.trained ? `entrenado, intensidad ${stat.intensity}%` : "no entrenado esta semana"}`} style={style} className="fill-(--muscle-fill) stroke-background stroke-[2] transition-[filter,opacity] outline-none hover:brightness-90 focus:stroke-foreground focus:stroke-[3]" onPointerEnter={showAtPointer} onPointerMove={showAtPointer} onPointerLeave={(event) => { if (event.pointerType === "mouse") setHover(null) }} onFocus={showAtFocus} onBlur={() => setHover(null)} onClick={showAtPointer} />
}

export function MuscleMap({ stats }: { stats: MuscleRegionStat[] }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)
  const byKey = useMemo(() => new Map(stats.map((stat) => [stat.key, stat])), [stats])
  const stat = (key: MuscleRegionKey) => byKey.get(key) ?? { key, name: key, trained: false, intensity: 0, sets: 0, volume: 0, sessions: [], improvementPercent: null }

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-3xl">
      <svg viewBox="0 0 520 500" className="h-auto w-full" role="img" aria-label="Mapa frontal y posterior de músculos entrenados esta semana">
        <text x="130" y="24" textAnchor="middle" className="fill-muted-foreground text-[13px] font-medium">FRONTAL</text>
        <text x="390" y="24" textAnchor="middle" className="fill-muted-foreground text-[13px] font-medium">POSTERIOR</text>
        <g className="fill-muted/40 stroke-border stroke-[2]">
          <ellipse cx="130" cy="62" rx="26" ry="31" /><path d="M116 90v17l-24 13 12 26h52l12-26-24-13V90z" />
          <path d="M75 132Q54 146 47 181l-18 82 18 5 28-72 12-48zM185 132q21 14 28 49l18 82-18 5-28-72-12-48z" />
          <path d="M103 267l-11 113 26 2 12-98 12 98 26-2-11-113z" /><path d="M92 380l-8 88 29 2 5-88zM168 380l8 88-29 2-5-88z" />
          <ellipse cx="390" cy="62" rx="26" ry="31" /><path d="M376 90v17l-24 13 12 26h52l12-26-24-13V90z" />
          <path d="M335 132q-21 14-28 49l-18 82 18 5 28-72 12-48zM445 132q21 14 28 49l18 82-18 5-28-72-12-48z" />
          <path d="M363 267l-11 113 26 2 12-98 12 98 26-2-11-113z" /><path d="M352 380l-8 88 29 2 5-88zM428 380l8 88-29 2-5-88z" />
        </g>

        <MuscleShape stat={stat("shoulders")} center={[82, 137]} setHover={setHover} d="M92 119q-25 1-38 19l21 20 27-12z" />
        <MuscleShape stat={stat("shoulders")} center={[178, 137]} setHover={setHover} d="M168 119q25 1 38 19l-21 20-27-12z" />
        <MuscleShape stat={stat("chest")} center={[108, 158]} setHover={setHover} d="M76 159q18-15 52-14v43q-32 5-51-17z" />
        <MuscleShape stat={stat("chest")} center={[152, 158]} setHover={setHover} d="M184 159q-18-15-52-14v43q32 5 51-17z" />
        <MuscleShape stat={stat("biceps")} center={[67, 189]} setHover={setHover} d="M55 163q17-8 27 1l-7 53q-17 11-27-3z" />
        <MuscleShape stat={stat("biceps")} center={[193, 189]} setHover={setHover} d="M205 163q-17-8-27 1l7 53q17 11 27-3z" />
        <MuscleShape stat={stat("abs")} center={[130, 218]} setHover={setHover} d="M101 190q29 9 58 0l9 65-20 27-18-20-18 20-20-27z" />
        <MuscleShape stat={stat("quads")} center={[110, 324]} setHover={setHover} d="M95 273q18-10 34 7l-12 96-25-2z" />
        <MuscleShape stat={stat("quads")} center={[150, 324]} setHover={setHover} d="M165 273q-18-10-34 7l12 96 25-2z" />
        <MuscleShape stat={stat("calves")} center={[101, 414]} setHover={setHover} d="M92 382q19-7 26 3l-8 61-23-1z" />
        <MuscleShape stat={stat("calves")} center={[159, 414]} setHover={setHover} d="M168 382q-19-7-26 3l8 61 23-1z" />

        <MuscleShape stat={stat("shoulders")} center={[342, 137]} setHover={setHover} d="M352 119q-25 1-38 19l21 20 27-12z" />
        <MuscleShape stat={stat("shoulders")} center={[438, 137]} setHover={setHover} d="M428 119q25 1 38 19l-21 20-27-12z" />
        <MuscleShape stat={stat("back")} center={[390, 177]} setHover={setHover} d="M365 142q25 10 50 0l18 51-20 58-23-17-23 17-20-58z" />
        <MuscleShape stat={stat("triceps")} center={[327, 190]} setHover={setHover} d="M315 161q17-7 27 3l-7 55q-17 9-27-5z" />
        <MuscleShape stat={stat("triceps")} center={[453, 190]} setHover={setHover} d="M465 161q-17-7-27 3l7 55q17 9 27-5z" />
        <MuscleShape stat={stat("glutes")} center={[370, 271]} setHover={setHover} d="M352 246q21-13 37 4v42q-25 13-39-9z" />
        <MuscleShape stat={stat("glutes")} center={[410, 271]} setHover={setHover} d="M428 246q-21-13-37 4v42q25 13 39-9z" />
        <MuscleShape stat={stat("hamstrings")} center={[370, 333]} setHover={setHover} d="M352 294q20 8 36 0l-11 82-25-2z" />
        <MuscleShape stat={stat("hamstrings")} center={[410, 333]} setHover={setHover} d="M428 294q-20 8-36 0l11 82 25-2z" />
        <MuscleShape stat={stat("calves")} center={[361, 414]} setHover={setHover} d="M352 382q19-7 26 3l-8 61-23-1z" />
        <MuscleShape stat={stat("calves")} center={[419, 414]} setHover={setHover} d="M428 382q-19-7-26 3l8 61 23-1z" />
      </svg>

      {hover ? (
        <div role="tooltip" className="pointer-events-none absolute z-20 w-64 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-xl" style={{ left: hover.x, top: hover.y, transform: hover.flip ? "translate(calc(-100% - 12px), -50%)" : "translate(12px, -50%)" }}>
          <div className="mb-2 flex items-center justify-between gap-2"><p className="font-semibold">{hover.stat.name}</p><Badge variant={hover.stat.trained ? "default" : "secondary"}>{hover.stat.trained ? "Entrenado" : "Sin entrenar"}</Badge></div>
          {hover.stat.trained ? <div className="grid gap-1.5 text-xs"><p><span className="text-muted-foreground">Intensidad:</span> {hover.stat.intensity}% · {hover.stat.sets} series</p><p><span className="text-muted-foreground">Volumen:</span> {hover.stat.volume.toLocaleString("es-ES")} kg</p><p><span className="text-muted-foreground">Sesión:</span> {hover.stat.sessions.join(", ") || "Sin nombre"}</p><p><span className="text-muted-foreground">Progreso:</span> {hover.stat.improvementPercent === null ? "Sin referencia previa" : `${hover.stat.improvementPercent > 0 ? "+" : ""}${hover.stat.improvementPercent.toLocaleString("es-ES")}% en 1RM estimado`}</p></div> : <p className="text-xs text-muted-foreground">No hay series completadas para este músculo durante la semana actual.</p>}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground"><span><i className="mr-1 inline-block size-2.5 rounded-sm bg-muted" />Sin entrenar</span><span><i className="mr-1 inline-block size-2.5 rounded-sm bg-chart-3" />Baja</span><span><i className="mr-1 inline-block size-2.5 rounded-sm bg-chart-2" />Media</span><span><i className="mr-1 inline-block size-2.5 rounded-sm bg-chart-1" />Alta</span><span><i className="mr-1 inline-block size-2.5 rounded-sm bg-chart-4" />Muy alta</span></div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Pasa el cursor, toca o enfoca cada músculo para ver el detalle.</p>
    </div>
  )
}
