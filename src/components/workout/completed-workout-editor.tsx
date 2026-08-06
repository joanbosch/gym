"use client"

import { useMemo, useState, useTransition } from "react"
import { CheckIcon, PlusIcon, SaveIcon, SkipForwardIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateCompletedWorkoutSession } from "@/actions/workout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { normalizeWorkoutLogs } from "@/lib/workout/guided"
import type { CompletedWorkoutSessionDetail, SetDraft } from "@/types/domain"

function completedVolume(logs: SetDraft[]) {
  return logs.reduce((total, log) => total + (log.status === "completed" ? (log.loadKg ?? 0) * (log.reps ?? 0) : 0), 0)
}

export function CompletedWorkoutEditor({ session }: { session: CompletedWorkoutSessionDetail }) {
  const router = useRouter()
  const [logs, setLogs] = useState(session.logs)
  const [attempted, setAttempted] = useState(false)
  const [pending, startTransition] = useTransition()
  const effectiveLogs = useMemo(() => normalizeWorkoutLogs(logs), [logs])
  const completed = effectiveLogs.filter((log) => log.status === "completed")
  const invalid = completed.some((log) => log.loadKg === null || log.reps === null)
  const volume = useMemo(() => completedVolume(effectiveLogs), [effectiveLogs])

  const update = (id: string, patch: Partial<SetDraft>) => {
    setLogs((current) => current.map((log) => log.id === id ? { ...log, ...patch, clientChangedAt: new Date().toISOString() } : log))
  }

  const addSet = (exerciseId: string) => {
    const exerciseLogs = logs.filter((log) => log.exerciseId === exerciseId)
    const setNumber = Math.max(0, ...exerciseLogs.map((log) => log.setNumber)) + 1
    if (setNumber > 20) {
      toast.error("No se pueden registrar más de 20 series por ejercicio")
      return
    }
    setLogs((current) => [...current, {
      id: crypto.randomUUID(),
      workoutKey: session.workout.id,
      sessionId: session.sessionId,
      exerciseId,
      setNumber,
      loadKg: null,
      reps: null,
      rir: null,
      status: "completed",
      completed: true,
      clientChangedAt: new Date().toISOString(),
    }])
  }

  const save = () => {
    setAttempted(true)
    if (invalid) {
      toast.error("Completa kilos y repeticiones y conserva al menos una serie")
      return
    }
    startTransition(async () => {
      const result = await updateCompletedWorkoutSession({ sessionId: session.sessionId, logs: effectiveLogs })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Entrenamiento actualizado")
      router.push("/rendimiento")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card size="sm">
        <CardHeader><CardTitle>Resumen actualizado</CardTitle><CardDescription>{completed.length} series completadas · {effectiveLogs.filter((log) => log.status === "skipped").length} omitidas · {volume.toLocaleString("es-ES")} kg de volumen. Las series con 0 kg o 0 repeticiones se consideran omitidas.</CardDescription></CardHeader>
      </Card>

      {session.workout.exercises.map((exercise) => {
        const exerciseLogs = logs.filter((log) => log.exerciseId === exercise.id).sort((a, b) => a.setNumber - b.setNumber)
        return (
          <Card key={exercise.id}>
            <CardHeader><CardTitle>{exercise.name}</CardTitle><CardDescription>{exerciseLogs.length} series registradas · objetivo {exercise.repMin}–{exercise.repMax} repeticiones</CardDescription></CardHeader>
            <CardContent>
              {exerciseLogs.length ? (
                <FieldSet>
                  <FieldLegend className="sr-only">Series de {exercise.name}</FieldLegend>
                  <FieldGroup>
                    {exerciseLogs.map((log) => {
                      const needsLoad = attempted && log.status === "completed" && log.loadKg === null
                      const needsReps = attempted && log.status === "completed" && log.reps === null
                      return (
                        <Card key={log.id} size="sm">
                          <CardHeader>
                            <CardTitle><Badge variant={log.status === "completed" ? "secondary" : "outline"}>Serie {log.setNumber}</Badge></CardTitle>
                            <CardAction className="flex gap-1">
                              <Button type="button" variant="outline" size="icon-sm" aria-label={log.status === "completed" ? `Omitir serie ${log.setNumber}` : `Recuperar serie ${log.setNumber}`} onClick={() => update(log.id, log.status === "completed" ? { status: "skipped", completed: false } : { status: "completed", completed: true })}>{log.status === "completed" ? <SkipForwardIcon /> : <CheckIcon />}</Button>
                              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Eliminar serie ${log.setNumber}`} onClick={() => setLogs((current) => current.filter((item) => item.id !== log.id))}><Trash2Icon /></Button>
                            </CardAction>
                          </CardHeader>
                          <CardContent><FieldGroup className="grid sm:grid-cols-3">
                            <Field data-invalid={needsLoad || undefined}><FieldLabel htmlFor={`${log.id}-load`}>Carga</FieldLabel><InputGroup><InputGroupInput id={`${log.id}-load`} type="number" inputMode="decimal" min="0" max="1000" step="0.5" disabled={log.status === "skipped"} value={log.loadKg ?? ""} aria-invalid={needsLoad || undefined} onChange={(event) => update(log.id, { loadKg: event.target.value === "" ? null : Number(event.target.value) })} /><InputGroupAddon align="inline-end"><InputGroupText>kg</InputGroupText></InputGroupAddon></InputGroup>{needsLoad ? <FieldError>Obligatorio</FieldError> : null}</Field>
                            <Field data-invalid={needsReps || undefined}><FieldLabel htmlFor={`${log.id}-reps`}>Repeticiones</FieldLabel><InputGroup><InputGroupInput id={`${log.id}-reps`} type="number" inputMode="numeric" min="0" max="1000" disabled={log.status === "skipped"} value={log.reps ?? ""} aria-invalid={needsReps || undefined} onChange={(event) => update(log.id, { reps: event.target.value === "" ? null : Number(event.target.value) })} /><InputGroupAddon align="inline-end"><InputGroupText>reps</InputGroupText></InputGroupAddon></InputGroup>{needsReps ? <FieldError>Obligatorio</FieldError> : null}</Field>
                            <Field><FieldLabel htmlFor={`${log.id}-rir`}>RIR</FieldLabel><InputGroup><InputGroupInput id={`${log.id}-rir`} type="number" inputMode="numeric" min="0" max="4" disabled={log.status === "skipped"} value={log.rir ?? ""} onChange={(event) => update(log.id, { rir: event.target.value === "" ? null : Number(event.target.value) })} /><InputGroupAddon align="inline-end"><InputGroupText>RIR</InputGroupText></InputGroupAddon></InputGroup></Field>
                          </FieldGroup></CardContent>
                        </Card>
                      )
                    })}
                  </FieldGroup>
                </FieldSet>
              ) : <FieldDescription>No hay series registradas para este ejercicio.</FieldDescription>}
            </CardContent>
            <CardFooter><Button type="button" variant="outline" onClick={() => addSet(exercise.id)}><PlusIcon data-icon="inline-start" />Añadir serie</Button></CardFooter>
          </Card>
        )
      })}

      <div className="sticky bottom-4 flex justify-end"><Button size="lg" disabled={pending} onClick={save}>{pending ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}{pending ? "Guardando…" : "Guardar cambios"}</Button></div>
    </div>
  )
}
