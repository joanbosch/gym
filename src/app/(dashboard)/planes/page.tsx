import { CopyIcon, FilePenLineIcon, PlusIcon } from "lucide-react"
import { PageHeading } from "@/components/dashboard/page-heading"
import { ProgramForm } from "@/components/forms/program-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { workouts } from "@/lib/demo-data"
import { requireRole } from "@/lib/auth"

export const metadata = { title: "Programas" }

export default async function ProgramsPage() {
  await requireRole(["admin", "coach"])
  return <><PageHeading title="Programas" description="Construye, publica y asigna planes sin alterar el historial." action={<Dialog><DialogTrigger asChild><Button><PlusIcon data-icon="inline-start" />Nuevo programa</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Nuevo programa</DialogTitle><DialogDescription>Crea el borrador base. Después podrás añadir semanas y sesiones.</DialogDescription></DialogHeader><ProgramForm /></DialogContent></Dialog>} /><Card><CardHeader><CardTitle>Plan híbrido de fuerza y cardio</CardTitle><CardDescription>12 semanas · Joan · revisión 1</CardDescription><CardAction><Badge>Publicado</Badge></CardAction></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{workouts.map((workout) => <div key={workout.id} className="rounded-lg border p-4"><p className="font-medium">{workout.name}</p><p className="text-sm text-muted-foreground">{workout.exercises.length} ejercicios · {workout.durationMinutes} min</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline"><FilePenLineIcon data-icon="inline-start" />Nueva revisión</Button><Button size="icon-sm" variant="ghost" aria-label={`Duplicar ${workout.name}`}><CopyIcon aria-hidden="true" /></Button></div></div>)}</CardContent></Card></>
}
