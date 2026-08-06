import Link from "next/link"
import type { ComponentType } from "react"
import { ActivityIcon, ArrowRightIcon, CalendarCheckIcon, DumbbellIcon, FlameIcon, GaugeIcon, Layers3Icon, PercentIcon, RulerIcon, ScaleIcon, TrendingUpIcon, TrophyIcon } from "lucide-react"
import { PageHeading } from "@/components/dashboard/page-heading"
import { BodyCompositionChart, MuscleIntensityChart, StrengthProgressChart, TrainingLoadChart } from "@/components/progress/performance-charts"
import { MuscleMap } from "@/components/progress/muscle-map"
import { WorkoutSessionHistory } from "@/components/workout/workout-session-history"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { loadPerformanceDashboard } from "@/lib/training/performance"

export const metadata = { title: "KPIs" }

function KpiCard({ icon: Icon, label, value, detail }: { icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>; label: string; value: string; detail: string }) {
  return <Card size="sm"><CardHeader><Icon className="text-muted-foreground" aria-hidden /><CardDescription>{label}</CardDescription><CardTitle className="text-2xl tabular-nums">{value}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{detail}</p></CardContent></Card>
}

function changeText(value: number | null, unit: string) {
  if (value === null) return "Sin comparación anterior"
  if (value === 0) return "Sin cambios desde la anterior"
  return `${value > 0 ? "+" : ""}${value.toLocaleString("es-ES")} ${unit} desde la anterior`
}

export default async function PerformancePage() {
  const dashboard = await loadPerformanceDashboard()
  const best = dashboard.exercises[0]
  const body = dashboard.bodyKpis

  return (
    <>
      <PageHeading
        title="KPIs y rendimiento"
        description="Indicadores ya calculados, tendencias y gráficos para tomar decisiones."
        action={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/medidas"><RulerIcon data-icon="inline-start" />Ver medidas</Link></Button><Button asChild><Link href="/entrenamiento">Entrenar <ArrowRightIcon data-icon="inline-end" /></Link></Button></div>}
      />

      <Alert>
        <TrendingUpIcon aria-hidden="true" />
        <AlertTitle>Lectura de la semana</AlertTitle>
        <AlertDescription>{dashboard.thisWeek.sessions} sesiones y {dashboard.thisWeek.sets} series completadas, con {dashboard.thisWeek.activeMuscles} grupos musculares activos. La intensidad se calcula a partir del RIR registrado.</AlertDescription>
      </Alert>

      <section aria-labelledby="training-kpis" className="flex flex-col gap-3">
        <div><h2 id="training-kpis" className="text-lg font-semibold">Resumen de entrenamiento</h2><p className="text-sm text-muted-foreground">Semana actual y evolución acumulada.</p></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-8">
          <KpiCard icon={CalendarCheckIcon} label="Sesiones esta semana" value={String(dashboard.thisWeek.sessions)} detail={`${dashboard.completedSessions} completadas en total`} />
          <KpiCard icon={Layers3Icon} label="Series esta semana" value={String(dashboard.thisWeek.sets)} detail="Solo series completadas" />
          <KpiCard icon={DumbbellIcon} label="Volumen semanal" value={`${dashboard.thisWeek.volume.toLocaleString("es-ES")} kg`} detail="Carga × repeticiones" />
          <KpiCard icon={GaugeIcon} label="RIR medio" value={dashboard.thisWeek.avgRir?.toLocaleString("es-ES") ?? "—"} detail="Menor RIR implica más intensidad" />
          <KpiCard icon={ActivityIcon} label="Músculos activos" value={`${dashboard.thisWeek.activeMuscles}/10`} detail="Grupos entrenados esta semana" />
          <KpiCard icon={FlameIcon} label="Racha actual" value={`${dashboard.streak} días`} detail="Días consecutivos con sesión" />
          <KpiCard icon={TrendingUpIcon} label="Mejora media" value={`${dashboard.thisWeek.improvement > 0 ? "+" : ""}${dashboard.thisWeek.improvement.toLocaleString("es-ES")}%`} detail="Sobre el 1RM estimado inicial" />
          <KpiCard icon={TrophyIcon} label="Mejor 1RM estimado" value={best ? `${best.bestE1rm.toLocaleString("es-ES")} kg` : "—"} detail={best?.name ?? "Sin marcas registradas"} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
        <Card>
          <CardHeader><CardTitle>Carga de entrenamiento</CardTitle><CardDescription>Volumen y series completadas durante las últimas 12 semanas.</CardDescription><CardAction><Badge variant="secondary">Semanal</Badge></CardAction></CardHeader>
          <CardContent>{dashboard.weeklyTrends.length ? <TrainingLoadChart data={dashboard.weeklyTrends} /> : <Empty><EmptyHeader><EmptyMedia variant="icon"><ActivityIcon /></EmptyMedia><EmptyTitle>Sin carga registrada</EmptyTitle><EmptyDescription>Completa una sesión para activar la tendencia semanal.</EmptyDescription></EmptyHeader></Empty>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Mapa muscular semanal</CardTitle><CardDescription>Pasa el cursor sobre cada músculo para consultar intensidad, sesión y mejora.</CardDescription><CardAction><Badge>{dashboard.thisWeek.activeMuscles} activos</Badge></CardAction></CardHeader>
          <CardContent><MuscleMap stats={dashboard.muscleStats} /></CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Progreso de fuerza</CardTitle><CardDescription>Compara el 1RM estimado inicial con tu mejor marca por ejercicio.</CardDescription></CardHeader><CardContent>{dashboard.exercises.length ? <StrengthProgressChart data={dashboard.exercises} /> : <Empty><EmptyHeader><EmptyTitle>Sin marcas de fuerza</EmptyTitle><EmptyDescription>Registra carga y repeticiones para calcular el 1RM estimado.</EmptyDescription></EmptyHeader></Empty>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Intensidad por grupo muscular</CardTitle><CardDescription>Índice relativo calculado desde el RIR: 100 % equivale a RIR 0.</CardDescription></CardHeader><CardContent><MuscleIntensityChart data={dashboard.muscleStats} /></CardContent></Card>
      </section>

      <section aria-labelledby="body-kpis" className="flex flex-col gap-3">
        <div><h2 id="body-kpis" className="text-lg font-semibold">Composición corporal</h2><p className="text-sm text-muted-foreground">Últimas medidas registradas y cambio respecto al control anterior.</p></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-6">
          <KpiCard icon={ScaleIcon} label="Peso" value={body.weight === null ? "—" : `${body.weight.toLocaleString("es-ES")} kg`} detail={changeText(body.weightChange, "kg")} />
          <KpiCard icon={GaugeIcon} label="IMC" value={body.bmi === null ? "—" : body.bmi.toLocaleString("es-ES")} detail="Peso relativo a la altura" />
          <KpiCard icon={PercentIcon} label="Grasa corporal" value={body.bodyFat === null ? "—" : `${body.bodyFat.toLocaleString("es-ES")}%`} detail={changeText(body.bodyFatChange, "p.p.")} />
          <KpiCard icon={ScaleIcon} label="Masa grasa" value={body.fatMass === null ? "—" : `${body.fatMass.toLocaleString("es-ES")} kg`} detail="Estimación por perímetros" />
          <KpiCard icon={ScaleIcon} label="Masa magra" value={body.leanMass === null ? "—" : `${body.leanMass.toLocaleString("es-ES")} kg`} detail="Peso libre de grasa estimado" />
          <KpiCard icon={RulerIcon} label="Cintura" value={body.waist === null ? "—" : `${body.waist.toLocaleString("es-ES")} cm`} detail={changeText(body.waistChange, "cm")} />
          <KpiCard icon={GaugeIcon} label="Cintura / altura" value={body.waistToHeightRatio === null ? "—" : body.waistToHeightRatio.toLocaleString("es-ES")} detail="Relación entre ambos perímetros" />
          <KpiCard icon={RulerIcon} label="Cuello" value={body.neck === null ? "—" : `${body.neck.toLocaleString("es-ES")} cm`} detail="Usado para estimar grasa" />
          {body.hip === null ? null : <KpiCard icon={RulerIcon} label="Cadera" value={`${body.hip.toLocaleString("es-ES")} cm`} detail="Usada por la fórmula femenina" />}
          <KpiCard icon={RulerIcon} label="Pecho" value={body.chest === null ? "—" : `${body.chest.toLocaleString("es-ES")} cm`} detail="Último perímetro registrado" />
          <KpiCard icon={RulerIcon} label="Brazo" value={body.arm === null ? "—" : `${body.arm.toLocaleString("es-ES")} cm`} detail="Último perímetro registrado" />
          <KpiCard icon={RulerIcon} label="Muslo" value={body.thigh === null ? "—" : `${body.thigh.toLocaleString("es-ES")} cm`} detail="Último perímetro registrado" />
        </div>
      </section>

      <Card>
        <CardHeader><CardTitle>Tendencia corporal</CardTitle><CardDescription>Peso, cintura y porcentaje de grasa a lo largo del tiempo.</CardDescription></CardHeader>
        <CardContent>{dashboard.bodyTrend.length ? <BodyCompositionChart data={dashboard.bodyTrend} /> : <Empty><EmptyHeader><EmptyMedia variant="icon"><ScaleIcon /></EmptyMedia><EmptyTitle>Sin medidas corporales</EmptyTitle><EmptyDescription>Registra peso, grasa o perímetros para empezar la tendencia.</EmptyDescription></EmptyHeader></Empty>}</CardContent>
      </Card>

      {dashboard.exercises.length ? (
        <Card>
          <CardHeader><CardTitle>Marcas por ejercicio</CardTitle><CardDescription>1RM estimado mediante Epley; úsalo como tendencia, no como intento máximo real.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Ejercicio</TableHead><TableHead>Grupo</TableHead><TableHead>Nivel</TableHead><TableHead className="text-right">1RM est.</TableHead><TableHead className="text-right">Mejora</TableHead><TableHead className="text-right">Última serie</TableHead><TableHead className="text-right">Volumen</TableHead></TableRow></TableHeader>
              <TableBody>{dashboard.exercises.map((exercise) => <TableRow key={exercise.exerciseId}><TableCell className="font-medium">{exercise.name}</TableCell><TableCell>{exercise.muscleGroup}</TableCell><TableCell><Badge variant="outline">{exercise.level}</Badge></TableCell><TableCell className="text-right font-medium">{exercise.bestE1rm.toLocaleString("es-ES")} kg</TableCell><TableCell className="text-right">{exercise.improvementPercent > 0 ? "+" : ""}{exercise.improvementPercent.toLocaleString("es-ES")}%</TableCell><TableCell className="text-right">{exercise.previousLoadKg.toLocaleString("es-ES")} kg × {exercise.previousReps}</TableCell><TableCell className="text-right">{exercise.totalVolume.toLocaleString("es-ES")} kg</TableCell></TableRow>)}</TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Historial de sesiones</CardTitle><CardDescription>Revisa tus entrenamientos completados o elimina un registro incorrecto.</CardDescription></CardHeader>
        <CardContent><WorkoutSessionHistory sessions={dashboard.sessions} /></CardContent>
      </Card>

      {!dashboard.exercises.length ? <Empty><EmptyHeader><EmptyMedia variant="icon"><DumbbellIcon /></EmptyMedia><EmptyTitle>Aún no hay marcas</EmptyTitle><EmptyDescription>Completa tu primera sesión para activar niveles y progresión automática.</EmptyDescription></EmptyHeader><EmptyContent><Button asChild><Link href="/entrenamiento">Registrar entrenamiento</Link></Button></EmptyContent></Empty> : null}
    </>
  )
}
