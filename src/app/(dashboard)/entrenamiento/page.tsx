import Link from "next/link"
import { CheckIcon, Clock3Icon, DumbbellIcon } from "lucide-react"
import { PageHeading } from "@/components/dashboard/page-heading"
import { GuidedWorkoutLauncher } from "@/components/workout/guided-workout-launcher"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { upperA, workouts } from "@/lib/demo-data"
import { enrichWorkoutWithPerformance } from "@/lib/training/performance"
import { loadActiveWorkoutSession } from "@/actions/workout"

export const metadata = { title: "Entrenamiento" }

export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ sesion?: string | string[] }>
}) {
  const requestedSession = (await searchParams).sesion
  const selectedWorkout = workouts.find((workout) => workout.id === requestedSession) ?? upperA
  const [workout, remoteActive] = await Promise.all([enrichWorkoutWithPerformance(selectedWorkout), loadActiveWorkoutSession()])

  return (
    <>
      <PageHeading title="Entrenamiento" description="Elige cualquier sesión del plan y registra cada serie con historial, progresión sugerida y descanso automático." />
      <section aria-labelledby="session-selector-title" className="flex flex-col gap-3">
        <div>
          <h2 id="session-selector-title" className="font-semibold">¿Qué quieres entrenar?</h2>
          <p className="text-sm text-muted-foreground">Puedes seguir la sesión prevista para hoy o adelantar otra del plan.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {workouts.map((option) => {
            const selected = option.id === workout.id
            const totalSets = option.exercises.reduce((total, exercise) => total + exercise.sets, 0)

            return (
              <Link
                key={option.id}
                href={`/entrenamiento?sesion=${option.id}`}
                aria-current={selected ? "page" : undefined}
                className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className={selected ? "h-full border-primary bg-primary/5" : "h-full transition-colors hover:border-primary/50 hover:bg-muted/40"}>
                  <CardHeader>
                    <DumbbellIcon aria-hidden="true" />
                    <CardTitle>{option.name}</CardTitle>
                    <CardDescription>{option.subtitle}</CardDescription>
                    {selected ? <Badge><CheckIcon data-icon="inline-start" />Seleccionada</Badge> : option.id === upperA.id ? <Badge variant="outline">Prevista hoy</Badge> : null}
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>{option.exercises.length} ejercicios · {totalSets} series</span>
                    <span className="inline-flex items-center gap-1"><Clock3Icon className="size-4" aria-hidden="true" />{option.durationMinutes} min</span>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>
      <Card><CardHeader><CardTitle>{workout.name}</CardTitle><CardDescription>{workout.subtitle} · {workout.exercises.length} ejercicios · {workout.exercises.reduce((total, exercise) => total + exercise.sets, 0)} series</CardDescription></CardHeader><CardContent><GuidedWorkoutLauncher workout={workout} remoteActive={remoteActive} /></CardContent></Card>
    </>
  )
}
