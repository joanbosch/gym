import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { notFound } from "next/navigation"
import { loadCompletedWorkoutSession } from "@/actions/workout"
import { PageHeading } from "@/components/dashboard/page-heading"
import { CompletedWorkoutEditor } from "@/components/workout/completed-workout-editor"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Editar entrenamiento" }

export default async function CompletedWorkoutPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const workout = await loadCompletedWorkoutSession(sessionId)
  if (!workout) notFound()

  return (
    <>
      <PageHeading
        title={`Editar ${workout.workout.name}`}
        description="Corrige las series registradas. Los KPIs se recalcularán al guardar."
        action={<Button asChild variant="outline"><Link href="/rendimiento"><ArrowLeftIcon data-icon="inline-start" />Volver al historial</Link></Button>}
      />
      <CompletedWorkoutEditor session={workout} />
    </>
  )
}
