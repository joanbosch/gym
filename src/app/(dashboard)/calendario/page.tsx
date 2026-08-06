import { CalendarDaysIcon, CheckIcon } from "lucide-react"
import { PageHeading } from "@/components/dashboard/page-heading"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { progression, weeklySchedule } from "@/lib/demo-data"

export const metadata = { title: "Calendario" }

export default function CalendarPage() {
  return (
    <>
      <PageHeading title="Calendario" description="Tu ciclo completo, con cargas y descargas visibles de un vistazo." />
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Semana 1</CardTitle><CardDescription>Entrada · aprende el recorrido y registra cargas</CardDescription></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {weeklySchedule.map((item) => (
              <article key={item.day} className="flex min-h-28 flex-col justify-between rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-muted-foreground">{item.day}</span>{item.done ? <CheckIcon className="text-primary" aria-label="Completado" /> : null}</div>
                <div><p className="font-semibold">{item.title}</p><Badge variant="secondary">{item.kind}</Badge></div>
              </article>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CalendarDaysIcon aria-hidden="true" /><CardTitle>Ciclo de 12 semanas</CardTitle><CardDescription>Semana 1 de 12</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4"><Progress value={8} aria-label="8 % del ciclo completado" /><div className="flex flex-col gap-2 text-sm"><p><strong>Semanas 1–4:</strong> Base</p><p><strong>Semanas 5–8:</strong> Construcción</p><p><strong>Semanas 9–12:</strong> Consolidación</p></div></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Progresión del ciclo</CardTitle><CardDescription>Las semanas 4 y 8 son descargas reales; la 12 evalúa sin perseguir el fallo.</CardDescription></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {progression.map(([week, type, rir, goal]) => (
            <div key={week} className="flex items-start gap-3 rounded-lg border p-3"><div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">{week}</div><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{type}</p><Badge variant="outline">{rir}</Badge></div><p className="text-sm text-muted-foreground">{goal}</p></div></div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
