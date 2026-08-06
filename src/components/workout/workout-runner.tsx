"use client"

import { useEffect, useState, useTransition } from "react"
import { CheckIcon, CloudOffIcon, CloudUploadIcon, CopyIcon, PauseIcon, PlayIcon, PlusIcon, RotateCcwIcon, SparklesIcon, TimerIcon, TrophyIcon } from "lucide-react"
import { toast } from "sonner"
import { finishWorkoutSession, syncSetLogs } from "@/actions/workout"
import { ExerciseVideoDialog } from "@/components/workout/exercise-video-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Progress } from "@/components/ui/progress"
import {
  clearDrafts,
  clearWorkoutStarted,
  deduplicateDrafts,
  hasWorkoutStarted,
  loadDrafts,
  markWorkoutStarted,
  replaceDrafts,
  storeDraft,
} from "@/lib/offline/workout-drafts"
import { calculateVolume } from "@/lib/validation/workout"
import type { PlannedWorkout, SetDraft } from "@/types/domain"

function createInitialLogs(workout: PlannedWorkout, sessionId: string): SetDraft[] {
  return workout.exercises.flatMap((exercise) =>
    Array.from({ length: exercise.sets }, (_, index) => ({
      id: crypto.randomUUID(),
      workoutKey: workout.id,
      sessionId,
      exerciseId: exercise.id,
      setNumber: index + 1,
      loadKg: null,
      reps: null,
      rir: null,
      completed: false,
      clientChangedAt: new Date().toISOString(),
    })),
  )
}

export function WorkoutRunner({ workout }: { workout: PlannedWorkout }) {
  const [logs, setLogs] = useState<SetDraft[]>([])
  const [started, setStarted] = useState(false)
  const [canResume, setCanResume] = useState(false)
  const [online, setOnline] = useState(true)
  const [seconds, setSeconds] = useState(0)
  const [restRemaining, setRestRemaining] = useState(0)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    const initial = createInitialLogs(workout, crypto.randomUUID())
    void hasWorkoutStarted(workout.id).then((value) => {
      if (!cancelled) setCanResume(value)
    })
    loadDrafts(workout.id).then((saved) => {
      if (cancelled) return

      const normalized = deduplicateDrafts(saved)
      const exerciseIds = new Set(workout.exercises.map((exercise) => exercise.id))
      const compatible = normalized.length >= initial.length
        && normalized.every((draft) => exerciseIds.has(draft.exerciseId))
        && initial.every((expected) => normalized.some((draft) => draft.exerciseId === expected.exerciseId && draft.setNumber === expected.setNumber))
      if (compatible) {
        void replaceDrafts(workout.id, normalized)
        setLogs(normalized)
        return
      }
      void replaceDrafts(workout.id, initial)
      setLogs(initial)
    })
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      cancelled = true
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [workout])

  useEffect(() => {
    if (!started) return
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [started])

  useEffect(() => {
    if (restRemaining <= 0) return
    const timer = window.setInterval(() => setRestRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [restRemaining])

  const completed = logs.filter((log) => log.completed).length
  const total = logs.length
  const volume = calculateVolume(logs)
  const updateLog = (id: string, patch: Partial<SetDraft>) => {
    setLogs((current) => current.map((log) => {
      if (log.id !== id) return log
      const next = { ...log, ...patch, clientChangedAt: new Date().toISOString() }
      void storeDraft(next)
      return next
    }))
  }

  const completeSet = (log: SetDraft, restSeconds: number, value: boolean) => {
    updateLog(log.id, { completed: value })
    if (value) setRestRemaining(restSeconds)
  }

  const copyPreviousSet = (log: SetDraft, exerciseLogs: SetDraft[], fallback?: { loadKg?: number; reps?: number; rir?: number | null }) => {
    const previous = exerciseLogs.find((item) => item.setNumber === log.setNumber - 1)
    updateLog(log.id, {
      loadKg: previous?.loadKg ?? fallback?.loadKg ?? null,
      reps: previous?.reps ?? fallback?.reps ?? null,
      rir: previous?.rir ?? fallback?.rir ?? null,
    })
  }

  const addSet = (exerciseId: string) => {
    const exerciseLogs = logs.filter((log) => log.exerciseId === exerciseId)
    const last = exerciseLogs.at(-1)
    if (!last || exerciseLogs.length >= 20) return
    const next: SetDraft = {
      ...last,
      id: crypto.randomUUID(),
      setNumber: last.setNumber + 1,
      completed: false,
      clientChangedAt: new Date().toISOString(),
    }
    setLogs((current) => [...current, next])
    void storeDraft(next)
  }

  const sync = () => startTransition(async () => {
    const result = await syncSetLogs(logs, workout)
    if (result.ok) toast.success(`${result.synced} series sincronizadas`)
    else toast.error(result.error)
  })

  const toggleStarted = () => {
    if (started) {
      setStarted(false)
      return
    }
    setStarted(true)
    setCanResume(true)
    void markWorkoutStarted(workout.id)
  }

  const finish = () => startTransition(async () => {
    if (!logs.some((log) => log.completed)) {
      toast.error("Completa al menos una serie")
      return
    }
    const result = await finishWorkoutSession(logs, workout)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    await clearDrafts(workout.id)
    await clearWorkoutStarted(workout.id)
    setStarted(false)
    setCanResume(false)
    toast.success("Sesión finalizada y guardada")
  })

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`

  return (
    <div className="flex flex-col gap-4">
      {!online ? <Alert><CloudOffIcon aria-hidden="true" /><AlertTitle>Estás sin conexión</AlertTitle><AlertDescription>Seguimos guardando cada serie en este dispositivo. Se sincronizará al volver la cobertura.</AlertDescription></Alert> : null}
      {restRemaining > 0 ? <Alert><TimerIcon aria-hidden="true" /><AlertTitle>Descanso · {Math.floor(restRemaining / 60)}:{String(restRemaining % 60).padStart(2, "0")}</AlertTitle><AlertDescription>Respira, prepara la siguiente serie y mantén la técnica. <Button variant="link" className="h-auto p-0" onClick={() => setRestRemaining(0)}>Omitir</Button></AlertDescription></Alert> : null}
      <Card>
        <CardHeader><CardTitle>{workout.name}</CardTitle><CardDescription>{workout.subtitle}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3"><Badge>{workout.targetRir}</Badge><Badge variant="secondary"><TimerIcon data-icon="inline-start" />{formatted}</Badge><span className="text-sm text-muted-foreground">{completed}/{total} series · {volume.toLocaleString("es-ES")} kg</span></div>
          <Progress value={total ? (completed / total) * 100 : 0} aria-label={`${completed} de ${total} series completadas`} />
        </CardContent>
        <CardFooter className="flex-wrap gap-2">
          <Button onClick={toggleStarted}>{started ? <PauseIcon data-icon="inline-start" /> : <PlayIcon data-icon="inline-start" />}{started ? "Pausar" : canResume ? "Reanudar sesión" : "Empezar sesión"}</Button>
          <Button variant="outline" onClick={sync} disabled={!online || isPending}><CloudUploadIcon data-icon="inline-start" />Sincronizar</Button>
          <Button variant="ghost" onClick={() => setSeconds(0)}><RotateCcwIcon data-icon="inline-start" />Reiniciar tiempo</Button>
        </CardFooter>
      </Card>
      <FieldGroup>
        {workout.exercises.map((exercise) => {
          const exerciseLogs = logs.filter((log) => log.exerciseId === exercise.id).sort((a, b) => a.setNumber - b.setNumber)
          return (
            <Card key={exercise.id}>
              <CardHeader>
                <CardTitle>{exercise.name}</CardTitle>
                <CardDescription>{exercise.sets} × {exercise.repMin}–{exercise.repMax} · RIR {exercise.targetRir} · {exercise.restSeconds}s</CardDescription>
                <CardAction className="flex flex-wrap justify-end gap-2">
                  {exercise.videoUrl ? <ExerciseVideoDialog name={exercise.name} videoUrl={exercise.videoUrl} /> : null}
                  {exercise.personalLevel ? <Badge variant="outline"><TrophyIcon data-icon="inline-start" />{exercise.personalLevel}</Badge> : null}
                  {exercise.loadSuggestion ? <Badge><SparklesIcon data-icon="inline-start" />{exercise.loadSuggestion.toLocaleString("es-ES")} kg sugeridos</Badge> : null}
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">{exercise.cue}</p>
                {exercise.progressionMessage ? <Alert><SparklesIcon aria-hidden="true" /><AlertTitle>Progresión automática</AlertTitle><AlertDescription>{exercise.progressionMessage}{exercise.estimated1Rm ? ` Mejor 1RM estimado: ${exercise.estimated1Rm.toLocaleString("es-ES")} kg.` : ""}</AlertDescription></Alert> : null}
                {exerciseLogs.map((log) => (
                  <Field key={log.id} orientation="responsive" className="rounded-lg border p-3" data-disabled={!started || undefined}>
                    <FieldLabel htmlFor={`${log.id}-load`} className="min-w-16">Serie {log.setNumber}</FieldLabel>
                    <div className="grid flex-1 grid-cols-[1fr_1fr_1fr_auto_auto] gap-2">
                      <InputGroup><InputGroupInput id={`${log.id}-load`} type="number" inputMode="decimal" min="0" step="0.5" placeholder={exercise.loadSuggestion?.toLocaleString("es-ES")} value={log.loadKg ?? ""} disabled={!started} aria-label={`Carga serie ${log.setNumber}`} onChange={(event) => updateLog(log.id, { loadKg: event.target.value ? Number(event.target.value) : null })} /><InputGroupAddon align="inline-end" className="hidden sm:flex"><InputGroupText>kg</InputGroupText></InputGroupAddon></InputGroup>
                      <InputGroup><InputGroupInput type="number" inputMode="numeric" min="0" placeholder={String(exercise.previousReps ?? exercise.repMin)} value={log.reps ?? ""} disabled={!started} aria-label={`Repeticiones serie ${log.setNumber}`} onChange={(event) => updateLog(log.id, { reps: event.target.value ? Number(event.target.value) : null })} /><InputGroupAddon align="inline-end" className="hidden sm:flex"><InputGroupText>reps</InputGroupText></InputGroupAddon></InputGroup>
                      <InputGroup><InputGroupInput type="number" inputMode="numeric" min="0" max="4" placeholder={String(exercise.targetRir)} value={log.rir ?? ""} disabled={!started} aria-label={`RIR serie ${log.setNumber}`} onChange={(event) => updateLog(log.id, { rir: event.target.value ? Number(event.target.value) : null })} /><InputGroupAddon align="inline-end" className="hidden sm:flex"><InputGroupText>RIR</InputGroupText></InputGroupAddon></InputGroup>
                      <Button type="button" size="icon" variant="ghost" disabled={!started} aria-label={`Copiar valores anteriores en serie ${log.setNumber}`} onClick={() => copyPreviousSet(log, exerciseLogs, { loadKg: exercise.loadSuggestion ?? exercise.previousLoadKg, reps: exercise.previousReps, rir: exercise.previousRir })}><CopyIcon /></Button>
                      <Checkbox checked={log.completed} disabled={!started} aria-label={`Completar serie ${log.setNumber}`} onCheckedChange={(value) => completeSet(log, exercise.restSeconds, value === true)} />
                    </div>
                  </Field>
                ))}
              </CardContent>
              <CardFooter><Button type="button" variant="ghost" onClick={() => addSet(exercise.id)} disabled={!started || exerciseLogs.length >= 20}><PlusIcon data-icon="inline-start" />Añadir serie</Button></CardFooter>
            </Card>
          )
        })}
      </FieldGroup>
      <Button size="lg" onClick={finish} disabled={isPending}><CheckIcon data-icon="inline-start" />Finalizar sesión</Button>
    </div>
  )
}
