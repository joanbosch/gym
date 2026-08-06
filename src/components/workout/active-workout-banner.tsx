"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, CloudOffIcon, DumbbellIcon } from "lucide-react"
import { finishGuidedWorkout, loadActiveWorkoutSession, startWorkoutSession, syncWorkoutProgress } from "@/actions/workout"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { clearLocalGuidedWorkout, guidedWorkoutChangeEvent, loadCurrentLocalGuidedWorkout, loadDrafts } from "@/lib/offline/workout-drafts"
import type { ActiveWorkoutSession, LocalGuidedWorkout } from "@/types/domain"

export function ActiveWorkoutBanner({ initialRemote }: { initialRemote: ActiveWorkoutSession | null }) {
  const [local, setLocal] = useState<LocalGuidedWorkout | null>(null)
  const [remote, setRemote] = useState(initialRemote)
  const syncing = useRef(false)

  const refresh = useCallback(async () => {
    const current = await loadCurrentLocalGuidedWorkout()
    setLocal(current)
    if (navigator.onLine && current && !syncing.current) {
      syncing.current = true
      try {
        const logs = (await loadDrafts(current.workoutKey)).filter((log) => log.sessionId === current.sessionId)
        const started = await startWorkoutSession({ sessionId: current.sessionId, startedAt: current.startedAt, workout: current.workout })
        if (started.ok) {
          if (current.syncState === "completion_pending" && current.completedAt) {
            const finished = await finishGuidedWorkout({ logs, workout: current.workout, completedAt: current.completedAt })
            if (finished.ok) {
              await clearLocalGuidedWorkout(current)
              setLocal(null)
            }
          } else {
            await syncWorkoutProgress(logs, current.workout)
          }
        }
      } finally {
        syncing.current = false
      }
    }
    if (navigator.onLine) setRemote(await loadActiveWorkoutSession())
  }, [])

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => { void refresh() }, 0)
    window.addEventListener("focus", refresh)
    window.addEventListener("online", refresh)
    window.addEventListener(guidedWorkoutChangeEvent, refresh)
    return () => {
      window.clearTimeout(initialRefresh)
      window.removeEventListener("focus", refresh)
      window.removeEventListener("online", refresh)
      window.removeEventListener(guidedWorkoutChangeEvent, refresh)
    }
  }, [refresh])

  const workoutName = local?.workout.name ?? remote?.workout.name
  if (!workoutName && !local && !remote) return null
  const pending = local?.syncState === "completion_pending"
  return (
    <Alert>
      {pending ? <CloudOffIcon aria-hidden="true" /> : <DumbbellIcon aria-hidden="true" />}
      <AlertTitle>{pending ? "Entrenamiento finalizado · pendiente de sincronizar" : "Tienes un entrenamiento en curso"}</AlertTitle>
      <AlertDescription>{workoutName}{pending ? " · Se subirá automáticamente cuando vuelva la conexión." : " · Continúa por la siguiente serie."}</AlertDescription>
      <AlertAction><Button asChild size="sm"><Link href="/entrenamiento/activo">{pending ? "Ver estado" : "Continuar"}<ArrowRightIcon data-icon="inline-end" /></Link></Button></AlertAction>
    </Alert>
  )
}
