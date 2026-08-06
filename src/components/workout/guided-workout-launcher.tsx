"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, PlayIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { discardWorkoutSession, startWorkoutSession } from "@/actions/workout"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { clearLocalGuidedWorkout, loadCurrentLocalGuidedWorkout, markWorkoutStarted, saveLocalGuidedWorkout } from "@/lib/offline/workout-drafts"
import { createGuidedLogs } from "@/lib/workout/guided"
import { replaceDrafts } from "@/lib/offline/workout-drafts"
import type { ActiveWorkoutSession, LocalGuidedWorkout, PlannedWorkout } from "@/types/domain"

export function GuidedWorkoutLauncher({ workout, remoteActive }: { workout: PlannedWorkout; remoteActive: ActiveWorkoutSession | null }) {
  const router = useRouter()
  const [localActive, setLocalActive] = useState<LocalGuidedWorkout | null>(null)
  const [pending, startTransition] = useTransition()
  const activeSessionId = localActive?.sessionId ?? remoteActive?.sessionId ?? null

  useEffect(() => { void loadCurrentLocalGuidedWorkout().then(setLocalActive) }, [])

  const start = () => startTransition(async () => {
    if (activeSessionId) {
      router.push("/entrenamiento/activo")
      return
    }
    const sessionId = crypto.randomUUID()
    const startedAt = new Date().toISOString()
    const logs = createGuidedLogs(workout, sessionId, startedAt)
    const local: LocalGuidedWorkout = {
      workoutKey: workout.id,
      sessionId,
      workout,
      startedAt,
      completedAt: null,
      currentStep: 0,
      restEndsAt: null,
      syncState: "active",
    }
    await Promise.all([saveLocalGuidedWorkout(local), replaceDrafts(workout.id, logs), markWorkoutStarted(workout.id)])
    setLocalActive(local)
    if (navigator.onLine) {
      const result = await startWorkoutSession({ sessionId, startedAt, workout })
      if (!result.ok && "conflict" in result && result.conflict) {
        await clearLocalGuidedWorkout(local)
        toast.info("Ya había un entrenamiento activo. Lo abrimos para continuar.")
      } else if (!result.ok) {
        toast.warning("Entrenamiento guardado en este dispositivo. Se sincronizará al recuperar conexión.")
      }
    }
    router.push("/entrenamiento/activo")
  })

  const discard = () => startTransition(async () => {
    if (localActive) await clearLocalGuidedWorkout(localActive)
    if (activeSessionId && navigator.onLine) {
      const result = await discardWorkoutSession(activeSessionId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
    }
    setLocalActive(null)
    toast.success("Entrenamiento descartado")
    router.refresh()
  })

  if (activeSessionId) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={() => router.push("/entrenamiento/activo")}><ArrowRightIcon data-icon="inline-start" />Continuar entrenamiento</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button size="lg" variant="outline"><Trash2Icon data-icon="inline-start" />Descartar activo</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Descartar el entrenamiento activo?</AlertDialogTitle><AlertDialogDescription>Las series ya sincronizadas se conservarán, pero esta sesión dejará de contar como entrenamiento completado.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={discard} disabled={pending}>Descartar sesión</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return <Button size="lg" onClick={start} disabled={pending}><PlayIcon data-icon="inline-start" />{pending ? "Iniciando…" : "Empezar entrenamiento guiado"}</Button>
}
