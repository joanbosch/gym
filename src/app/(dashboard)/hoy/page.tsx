import Link from "next/link"
import { ActivityIcon, CheckCircle2Icon, Clock3Icon, DumbbellIcon, FlameIcon, MoonStarIcon } from "lucide-react"
import { PageHeading } from "@/components/dashboard/page-heading"
import { TodayWorkoutLink } from "@/components/workout/today-workout-link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { upperA, weeklySchedule } from "@/lib/demo-data"

export const metadata = { title: "Hoy" }

export default function TodayPage() {
  return (
    <>
      <PageHeading title="Buenos días, Joan" description="Hoy toca construir sin comprometer la recuperación." action={<Badge variant="outline">Bloque 1 · Base</Badge>} />
      <Alert>
        <ActivityIcon aria-hidden="true" />
        <AlertTitle>Semáforo verde</AlertTitle>
        <AlertDescription>Dormiste bien y no has registrado molestias. Ejecuta la sesión prevista con RIR 3.</AlertDescription>
      </Alert>
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><DumbbellIcon aria-hidden="true" /></div>
            <CardTitle>Upper A</CardTitle>
            <CardDescription>Base de fuerza del torso · {upperA.exercises.length} ejercicios · {upperA.exercises.reduce((total, exercise) => total + exercise.sets, 0)} series</CardDescription>
            <CardAction><Badge>RIR 3</Badge></CardAction>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm"><Clock3Icon className="text-muted-foreground" aria-hidden="true" /><span>65–75 min</span></div>
            <div className="flex items-center gap-2 text-sm"><FlameIcon className="text-muted-foreground" aria-hidden="true" /><span>Prioridad torso</span></div>
            <div className="flex items-center gap-2 text-sm"><MoonStarIcon className="text-muted-foreground" aria-hidden="true" /><span>Energía 4/5</span></div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <TodayWorkoutLink workoutId="upper-a" />
            <Button asChild variant="outline" size="lg"><Link href="/calendario">Ver calendario</Link></Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Objetivo semanal</CardTitle>
            <CardDescription>2 de 6 actividades completadas</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress value={33} aria-label="33 % completado" />
            <div className="flex flex-col gap-2">
              {weeklySchedule.slice(0, 4).map((item) => (
                <div key={item.day} className="flex items-center gap-3 text-sm">
                  {item.done ? <CheckCircle2Icon className="text-primary" aria-hidden="true" /> : <div className="size-4 rounded-full border" />}
                  <span className="w-9 text-muted-foreground">{item.day}</span><span className="flex-1">{item.title}</span><Badge variant="secondary">{item.kind}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Peso medio", "75,8 kg", "−0,4 kg desde inicio"],
          ["Cintura", "85,3 cm", "−0,7 cm desde inicio"],
          ["Sueño", "7 h 38 min", "Objetivo 7–9 horas"],
          ["Proteína", "156 g", "Objetivo 150–170 g"],
        ].map(([title, value, note]) => (
          <Card key={title} size="sm"><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-2xl">{value}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{note}</p></CardContent></Card>
        ))}
      </section>
    </>
  )
}
