"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, CloudOffIcon, CloudUploadIcon, DumbbellIcon, ListChecksIcon, PlusIcon, SkipForwardIcon, TimerIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { discardWorkoutSession, finishGuidedWorkout, startWorkoutSession, syncWorkoutProgress } from "@/actions/workout"
import { ExerciseVideoDialog } from "@/components/workout/exercise-video-dialog"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  clearLocalGuidedWorkout,
  loadCurrentLocalGuidedWorkout,
  loadDrafts,
  replaceDrafts,
  saveLocalGuidedWorkout,
  storeDraft,
} from "@/lib/offline/workout-drafts"
import { createGuidedLogs, firstPendingStep, guidedWorkoutVolume, mergeGuidedLogs, normalizeWorkoutLogs, orderedGuidedLogs } from "@/lib/workout/guided"
import type { ActiveWorkoutSession, LocalGuidedWorkout, SetDraft } from "@/types/domain"

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor(totalSeconds % 3600 / 60)
  const seconds = totalSeconds % 60
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function localFromRemote(remote: ActiveWorkoutSession): LocalGuidedWorkout {
  return {
    workoutKey: remote.workout.id,
    sessionId: remote.sessionId,
    workout: remote.workout,
    startedAt: remote.startedAt,
    completedAt: null,
    currentStep: 0,
    restEndsAt: null,
    syncState: "active",
  }
}

export function GuidedWorkoutRunner({ initialRemote }: { initialRemote: ActiveWorkoutSession | null }) {
  const router = useRouter()
  const [session, setSession] = useState<LocalGuidedWorkout | null>(null)
  const [logs, setLogs] = useState<SetDraft[]>([])
  const [ready, setReady] = useState(false)
  const [online, setOnline] = useState(true)
  const [now, setNow] = useState(() => new Date().getTime())
  const [attempted, setAttempted] = useState(false)
  const [remoteConflict, setRemoteConflict] = useState<ActiveWorkoutSession | null>(null)
  const [pending, startTransition] = useTransition()

  const persist = useCallback(async (nextSession: LocalGuidedWorkout, nextLogs?: SetDraft[]) => {
    setSession(nextSession)
    await saveLocalGuidedWorkout(nextSession)
    if (nextLogs) {
      setLogs(nextLogs)
      await replaceDrafts(nextSession.workoutKey, nextLogs)
    }
  }, [])

  const adoptRemote = useCallback(async (remote: ActiveWorkoutSession) => {
    const local = localFromRemote(remote)
    const base = createGuidedLogs(remote.workout, remote.sessionId, remote.startedAt)
    const merged = orderedGuidedLogs(remote.workout, mergeGuidedLogs([], [...base, ...remote.logs]))
    local.currentStep = firstPendingStep(merged)
    await persist(local, merged)
    setRemoteConflict(null)
  }, [persist])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const local = await loadCurrentLocalGuidedWorkout()
      if (cancelled) return
      if (local) {
        const saved = (await loadDrafts(local.workoutKey)).filter((log) => log.sessionId === local.sessionId)
        const base = createGuidedLogs(local.workout, local.sessionId, local.startedAt)
        const remoteLogs = initialRemote?.sessionId === local.sessionId ? initialRemote.logs : []
        const merged = orderedGuidedLogs(local.workout, mergeGuidedLogs([...base, ...saved], remoteLogs))
        await persist({ ...local, currentStep: Math.min(local.currentStep, merged.length) }, merged)
        if (initialRemote && initialRemote.sessionId !== local.sessionId) setRemoteConflict(initialRemote)
      } else if (initialRemote) {
        await adoptRemote(initialRemote)
      }
      if (!cancelled) setReady(true)
    })()
    const updateOnline = () => setOnline(navigator.onLine)
    updateOnline()
    window.addEventListener("online", updateOnline)
    window.addEventListener("offline", updateOnline)
    return () => {
      cancelled = true
      window.removeEventListener("online", updateOnline)
      window.removeEventListener("offline", updateOnline)
    }
  }, [adoptRemote, initialRemote, persist])

  const ordered = useMemo(() => session ? orderedGuidedLogs(session.workout, logs) : logs, [logs, session])
  const currentIndex = session ? Math.min(session.currentStep, ordered.length) : 0
  const currentLog = ordered[currentIndex]
  const currentExercise = session?.workout.exercises.find((exercise) => exercise.id === currentLog?.exerciseId)
  const completed = ordered.filter((log) => log.status === "completed").length
  const skipped = ordered.filter((log) => log.status === "skipped").length
  const handled = completed + skipped
  const unresolved = ordered.some((log) => log.status === "pending")
  const progress = ordered.length ? handled / ordered.length * 100 : 0
  const elapsedSeconds = session ? Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000)) : 0
  const restRemaining = session?.restEndsAt ? Math.max(0, Math.ceil((new Date(session.restEndsAt).getTime() - now) / 1000)) : 0

  useEffect(() => {
    if (!session) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [session])

  const flush = useCallback(async (active: LocalGuidedWorkout, activeLogs: SetDraft[]) => {
    if (!navigator.onLine) return false
    const started = await startWorkoutSession({ sessionId: active.sessionId, startedAt: active.startedAt, workout: active.workout })
    if (!started.ok) return false
    if (active.syncState === "completion_pending" && active.completedAt) {
      const result = await finishGuidedWorkout({ logs: activeLogs, workout: active.workout, completedAt: active.completedAt })
      if (result.ok) {
        await clearLocalGuidedWorkout(active)
        toast.success("Entrenamiento sincronizado")
        router.push("/rendimiento")
        router.refresh()
        return true
      }
      return false
    }
    const result = await syncWorkoutProgress(activeLogs, active.workout)
    return result.ok
  }, [router])

  useEffect(() => {
    if (!session || !online) return
    const sync = () => { void flush(session, ordered) }
    window.addEventListener("focus", sync)
    window.addEventListener("online", sync)
    if (session.syncState === "completion_pending") sync()
    return () => {
      window.removeEventListener("focus", sync)
      window.removeEventListener("online", sync)
    }
  }, [flush, online, ordered, session])

  const updateCurrent = (patch: Partial<SetDraft>) => {
    if (!currentLog) return
    const next = { ...currentLog, ...patch, clientChangedAt: new Date().toISOString() }
    setLogs((items) => items.map((item) => item.id === currentLog.id ? next : item))
    void storeDraft(next)
  }

  const moveAfter = async (nextLogs: SetDraft[], restSeconds: number) => {
    if (!session) return
    const sorted = orderedGuidedLogs(session.workout, nextLogs)
    let nextIndex = sorted.findIndex((log, index) => index > currentIndex && log.status === "pending")
    if (nextIndex === -1) nextIndex = sorted.findIndex((log) => log.status === "pending")
    if (nextIndex === -1) nextIndex = sorted.length
    const restEndsAt = restSeconds ? new Date(new Date().getTime() + restSeconds * 1000).toISOString() : null
    const nextSession = { ...session, currentStep: nextIndex, restEndsAt }
    await persist(nextSession, sorted)
    setAttempted(false)
    if (online) startTransition(async () => {
      const synced = await flush(nextSession, sorted)
      if (!synced) toast.warning("Guardado en este dispositivo; falta sincronizar")
    })
  }

  const saveAndNext = () => {
    setAttempted(true)
    if (!currentLog || !currentExercise || currentLog.loadKg === null || currentLog.reps === null) return
    const changed = normalizeWorkoutLogs([{ ...currentLog, status: "completed", completed: true, clientChangedAt: new Date().toISOString() }])[0]
    const nextLogs = logs.map((log) => log.id === changed.id ? changed : log)
    if (changed.status === "skipped") toast.info("Serie omitida: 0 kg o 0 repeticiones no cuentan para los KPIs")
    void moveAfter(nextLogs, changed.status === "completed" ? currentExercise.restSeconds : 0)
  }

  const skipAndNext = () => {
    if (!currentLog) return
    const changed: SetDraft = { ...currentLog, status: "skipped", completed: false, clientChangedAt: new Date().toISOString() }
    const nextLogs = logs.map((log) => log.id === changed.id ? changed : log)
    void moveAfter(nextLogs, 0)
  }

  const skipExercise = () => {
    if (!currentExercise) return
    const changedAt = new Date().toISOString()
    const nextLogs = logs.map((log): SetDraft => log.exerciseId === currentExercise.id && log.status === "pending"
      ? { ...log, status: "skipped", completed: false, clientChangedAt: changedAt }
      : log)
    void moveAfter(nextLogs, 0)
  }

  const addSet = () => {
    if (!session || !currentExercise) return
    const exerciseLogs = logs.filter((log) => log.exerciseId === currentExercise.id)
    const setNumber = Math.max(0, ...exerciseLogs.map((log) => log.setNumber)) + 1
    if (setNumber > 20) return
    const next: SetDraft = {
      id: crypto.randomUUID(), workoutKey: session.workoutKey, sessionId: session.sessionId,
      exerciseId: currentExercise.id, setNumber, loadKg: null, reps: null, rir: null,
      status: "pending", completed: false, clientChangedAt: new Date().toISOString(),
    }
    const nextLogs = orderedGuidedLogs(session.workout, [...logs, next])
    const nextIndex = nextLogs.findIndex((log) => log.id === next.id)
    void persist({ ...session, currentStep: nextIndex }, nextLogs)
    setAttempted(false)
  }

  const goTo = (index: number) => {
    if (!session) return
    setAttempted(false)
    void persist({ ...session, currentStep: index })
  }

  const changeRest = (seconds: number) => {
    if (!session) return
    const currentTime = new Date().getTime()
    const nextEnd = seconds === 0 ? null : new Date(Math.max(currentTime, session.restEndsAt ? new Date(session.restEndsAt).getTime() : currentTime) + seconds * 1000).toISOString()
    void persist({ ...session, restEndsAt: nextEnd })
  }

  const finish = () => {
    if (!session) return
    startTransition(async () => {
      const completedAt = new Date().toISOString()
      const finalLogs = normalizeWorkoutLogs(ordered, true)
      if (!online) {
        await persist({ ...session, completedAt, syncState: "completion_pending", currentStep: finalLogs.length }, finalLogs)
        toast.success("Entrenamiento finalizado en este dispositivo")
        return
      }
      const result = await finishGuidedWorkout({ logs: finalLogs, workout: session.workout, completedAt })
      if (!result.ok) {
        await persist({ ...session, completedAt, syncState: "completion_pending", currentStep: finalLogs.length }, finalLogs)
        toast.warning("Finalizado localmente; queda pendiente de sincronizar")
        return
      }
      await clearLocalGuidedWorkout(session)
      toast.success("Entrenamiento finalizado y guardado")
      router.push("/rendimiento")
      router.refresh()
    })
  }

  const discard = () => {
    if (!session) return
    startTransition(async () => {
      if (online) {
        const result = await discardWorkoutSession(session.sessionId)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
      }
      await clearLocalGuidedWorkout(session)
      router.push("/entrenamiento")
      router.refresh()
    })
  }

  const keepLocalConflict = () => {
    if (!session || !remoteConflict) return
    startTransition(async () => {
      if (online) await discardWorkoutSession(remoteConflict.sessionId)
      await startWorkoutSession({ sessionId: session.sessionId, startedAt: session.startedAt, workout: session.workout })
      setRemoteConflict(null)
    })
  }

  if (!ready) return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Preparando entrenamiento…</div>

  if (!session) {
    return <div className="flex min-h-dvh items-center justify-center p-4"><Empty><EmptyHeader><EmptyMedia variant="icon"><DumbbellIcon /></EmptyMedia><EmptyTitle>No hay un entrenamiento activo</EmptyTitle><EmptyDescription>Selecciona una sesión de fuerza para comenzar el recorrido guiado.</EmptyDescription></EmptyHeader><EmptyContent><Button asChild><Link href="/entrenamiento">Elegir entrenamiento</Link></Button></EmptyContent></Empty></div>
  }

  if (session.syncState === "completion_pending") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl items-center p-4">
        <Card className="w-full"><CardHeader><CloudOffIcon aria-hidden="true" /><CardTitle>Entrenamiento finalizado</CardTitle><CardDescription>Los datos están seguros en este dispositivo y pendientes de sincronizar con Supabase.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">{completed} series · {guidedWorkoutVolume(ordered).toLocaleString("es-ES")} kg · {formatDuration(elapsedSeconds)}</p></CardContent><CardFooter className="flex-wrap gap-2"><Button onClick={() => startTransition(async () => { if (!await flush(session, ordered)) toast.error("Todavía no se puede sincronizar") })} disabled={!online || pending}><CloudUploadIcon data-icon="inline-start" />Sincronizar ahora</Button><Button asChild variant="outline"><Link href="/hoy">Salir</Link></Button></CardFooter></Card>
      </div>
    )
  }

  const invalidLoad = attempted && currentLog?.loadKg === null
  const invalidReps = attempted && currentLog?.reps === null
  const isSummary = currentIndex >= ordered.length
  const currentExerciseIndex = currentExercise
    ? session.workout.exercises.findIndex((exercise) => exercise.id === currentExercise.id)
    : -1
  const currentExerciseLogs = currentExercise
    ? ordered.filter((log) => log.exerciseId === currentExercise.id)
    : []

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Salir del modo guiado"><Link href="/entrenamiento"><ArrowLeftIcon /></Link></Button>
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{session.workout.name}</p><p className="text-xs text-muted-foreground">{handled}/{ordered.length} series · {formatDuration(elapsedSeconds)}</p></div>
          <Badge variant={online ? "secondary" : "outline"}>{online ? "Online" : "Offline"}</Badge>
        </div>
        <Progress value={progress} aria-label={`${handled} de ${ordered.length} series resueltas`} className="rounded-none" />
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 pb-28">
        {remoteConflict ? <Alert><CloudOffIcon aria-hidden="true" /><AlertTitle>Hay dos entrenamientos activos</AlertTitle><AlertDescription>Elige cuál conservar antes de seguir sincronizando.</AlertDescription><AlertAction className="flex gap-1"><Button size="sm" variant="outline" onClick={() => void adoptRemote(remoteConflict)}>Usar remoto</Button><Button size="sm" onClick={keepLocalConflict}>Usar este</Button></AlertAction></Alert> : null}
        {!online ? <Alert><CloudOffIcon aria-hidden="true" /><AlertTitle>Trabajando sin conexión</AlertTitle><AlertDescription>Cada cambio se guarda primero en este dispositivo.</AlertDescription></Alert> : null}
        {restRemaining > 0 ? <Alert><TimerIcon aria-hidden="true" /><AlertTitle>Descanso · {formatDuration(restRemaining)}</AlertTitle><AlertDescription>La siguiente serie ya está preparada.</AlertDescription><AlertAction className="flex gap-1"><Button size="sm" variant="outline" onClick={() => changeRest(30)}>+30 s</Button><Button size="sm" variant="ghost" onClick={() => changeRest(0)}>Omitir</Button></AlertAction></Alert> : null}

        <nav aria-label="Progreso por series">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-2 md:hidden">
            <Button type="button" variant="outline" size="icon" aria-label="Serie anterior" disabled={currentIndex === 0} onClick={() => goTo(currentIndex - 1)}>
              <ChevronLeftIcon />
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" className="h-auto min-w-0 justify-between py-2 text-left">
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">{isSummary ? "Entrenamiento" : `Ejercicio ${currentExerciseIndex + 1} de ${session.workout.exercises.length}`}</span>
                    <span className="block truncate">{isSummary ? "Resumen" : `${currentExercise?.name} · Serie ${currentLog?.setNumber} de ${currentExerciseLogs.length}`}</span>
                  </span>
                  <ListChecksIcon data-icon="inline-end" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl">
                <SheetHeader>
                  <SheetTitle>Ir a una serie</SheetTitle>
                  <SheetDescription>Consulta el progreso y vuelve a cualquier serie para corregirla.</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 px-4 pb-4">
                  {session.workout.exercises.map((exercise, exerciseIndex) => {
                    const exerciseLogs = ordered.filter((log) => log.exerciseId === exercise.id)
                    return (
                      <section key={exercise.id} className="flex flex-col gap-2" aria-labelledby={`mobile-step-${exercise.id}`}>
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 id={`mobile-step-${exercise.id}`} className="min-w-0 truncate text-sm font-medium">{exerciseIndex + 1}. {exercise.name}</h3>
                          <span className="shrink-0 text-xs text-muted-foreground">{exerciseLogs.filter((log) => log.status !== "pending").length}/{exerciseLogs.length}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {exerciseLogs.map((log) => {
                            const index = ordered.findIndex((item) => item.id === log.id)
                            return (
                              <SheetClose key={log.id} asChild>
                                <Button type="button" size="sm" variant={index === currentIndex ? "default" : log.status === "pending" ? "outline" : "secondary"} className="justify-start" aria-label={`${exercise.name}, serie ${log.setNumber}, ${log.status}`} onClick={() => goTo(index)}>
                                  {log.status === "completed" ? <CheckIcon data-icon="inline-start" /> : log.status === "skipped" ? <SkipForwardIcon data-icon="inline-start" /> : null}
                                  Serie {log.setNumber}
                                </Button>
                              </SheetClose>
                            )
                          })}
                        </div>
                      </section>
                    )
                  })}
                  <SheetClose asChild>
                    <Button type="button" variant={isSummary ? "default" : "outline"} onClick={() => goTo(ordered.length)}>
                      <ListChecksIcon data-icon="inline-start" />
                      Ver resumen
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
            <Button type="button" variant="outline" size="icon" aria-label="Serie siguiente" disabled={isSummary} onClick={() => goTo(currentIndex + 1)}>
              <ChevronRightIcon />
            </Button>
          </div>

          <div className="hidden flex-wrap gap-2 md:flex">
            {session.workout.exercises.map((exercise, exerciseIndex) => {
              const exerciseLogs = ordered.filter((log) => log.exerciseId === exercise.id)
              return <div key={exercise.id} className="flex flex-col gap-1 rounded-lg border p-2"><span className="max-w-36 truncate text-xs font-medium">{exerciseIndex + 1}. {exercise.name}</span><div className="flex gap-1">{exerciseLogs.map((log) => { const index = ordered.findIndex((item) => item.id === log.id); return <Button key={log.id} type="button" size="icon-sm" variant={index === currentIndex ? "default" : log.status === "pending" ? "outline" : "secondary"} aria-label={`${exercise.name}, serie ${log.setNumber}, ${log.status}`} onClick={() => goTo(index)}>{log.status === "completed" ? <CheckIcon /> : log.status === "skipped" ? <SkipForwardIcon /> : log.setNumber}</Button> })}</div></div>
            })}
            <Button type="button" variant={isSummary ? "default" : "outline"} className="h-auto self-stretch" onClick={() => goTo(ordered.length)}>Resumen</Button>
          </div>
        </nav>

        {isSummary ? (
          <Card><CardHeader><CheckIcon aria-hidden="true" /><CardTitle>Resumen del entrenamiento</CardTitle><CardDescription>{unresolved ? "Las series pendientes se guardarán como omitidas y no contarán para los KPIs." : "Revisa los resultados antes de cerrar la sesión."}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div><p className="text-sm text-muted-foreground">Series completadas</p><p className="text-2xl font-semibold">{completed}</p></div><div><p className="text-sm text-muted-foreground">Series omitidas</p><p className="text-2xl font-semibold">{skipped + (unresolved ? ordered.filter((log) => log.status === "pending").length : 0)}</p></div><div><p className="text-sm text-muted-foreground">Volumen</p><p className="text-2xl font-semibold">{guidedWorkoutVolume(ordered).toLocaleString("es-ES")} kg</p></div></CardContent><CardFooter className="flex-wrap gap-2"><Button size="lg" onClick={finish} disabled={pending}><CheckIcon data-icon="inline-start" />Finalizar entrenamiento</Button>{unresolved ? <Button variant="outline" onClick={() => goTo(firstPendingStep(ordered))}>Completar pendientes</Button> : null}</CardFooter></Card>
        ) : currentLog && currentExercise ? (
          <Card>
            <CardHeader><Badge variant="outline">Ejercicio {session.workout.exercises.findIndex((exercise) => exercise.id === currentExercise.id) + 1} de {session.workout.exercises.length}</Badge><CardTitle className="text-2xl">{currentExercise.name}</CardTitle><CardDescription>Serie {currentLog.setNumber} · {currentExercise.repMin}–{currentExercise.repMax} repeticiones · RIR {currentExercise.targetRir} · descanso {currentExercise.restSeconds}s</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">{currentExercise.loadSuggestion !== undefined ? <Badge>{currentExercise.loadSuggestion.toLocaleString("es-ES")} kg sugeridos</Badge> : null}{currentExercise.videoUrl ? <ExerciseVideoDialog name={currentExercise.name} videoUrl={currentExercise.videoUrl} /> : null}</div>
              <p className="text-sm text-muted-foreground">{currentExercise.cue}</p>
              <FieldSet><FieldLegend>Resultado de la serie</FieldLegend><FieldDescription>Introduce los datos cuando termines. Una carga o repeticiones de 0 guardarán la serie como omitida y no contará para los KPIs.</FieldDescription><FieldGroup className="grid sm:grid-cols-3">
                <Field data-invalid={invalidLoad || undefined}><FieldLabel htmlFor={`${currentLog.id}-load`}>Carga</FieldLabel><InputGroup><InputGroupInput id={`${currentLog.id}-load`} type="number" inputMode="decimal" min="0" max="1000" step="0.5" value={currentLog.loadKg ?? ""} aria-invalid={invalidLoad || undefined} onChange={(event) => updateCurrent({ loadKg: event.target.value === "" ? null : Number(event.target.value), status: "pending", completed: false })} /><InputGroupAddon align="inline-end"><InputGroupText>kg</InputGroupText></InputGroupAddon></InputGroup>{invalidLoad ? <FieldError>Indica los kilos; usa 0 para peso corporal.</FieldError> : null}</Field>
                <Field data-invalid={invalidReps || undefined}><FieldLabel htmlFor={`${currentLog.id}-reps`}>Repeticiones</FieldLabel><InputGroup><InputGroupInput id={`${currentLog.id}-reps`} type="number" inputMode="numeric" min="0" max="1000" value={currentLog.reps ?? ""} aria-invalid={invalidReps || undefined} onChange={(event) => updateCurrent({ reps: event.target.value === "" ? null : Number(event.target.value), status: "pending", completed: false })} /><InputGroupAddon align="inline-end"><InputGroupText>reps</InputGroupText></InputGroupAddon></InputGroup>{invalidReps ? <FieldError>Indica las repeticiones realizadas.</FieldError> : null}</Field>
                <Field><FieldLabel htmlFor={`${currentLog.id}-rir`}>RIR opcional</FieldLabel><InputGroup><InputGroupInput id={`${currentLog.id}-rir`} type="number" inputMode="numeric" min="0" max="4" value={currentLog.rir ?? ""} onChange={(event) => updateCurrent({ rir: event.target.value === "" ? null : Number(event.target.value), status: "pending", completed: false })} /><InputGroupAddon align="inline-end"><InputGroupText>RIR</InputGroupText></InputGroupAddon></InputGroup></Field>
              </FieldGroup></FieldSet>
            </CardContent>
            <CardFooter className="flex-wrap gap-2"><Button size="lg" onClick={saveAndNext}>{currentLog.status === "completed" ? "Guardar cambios y siguiente" : "Guardar serie y siguiente"}<ArrowRightIcon data-icon="inline-end" /></Button><Button variant="outline" onClick={skipAndNext}><SkipForwardIcon data-icon="inline-start" />Saltar serie</Button><Button variant="outline" onClick={skipExercise}><SkipForwardIcon data-icon="inline-start" />Saltar ejercicio</Button><Button variant="ghost" onClick={addSet}><PlusIcon data-icon="inline-start" />Añadir serie</Button></CardFooter>
          </Card>
        ) : null}

        <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" className="self-start"><Trash2Icon data-icon="inline-start" />Descartar entrenamiento</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Descartar este entrenamiento?</AlertDialogTitle><AlertDialogDescription>Dejará de estar activo. Las series ya sincronizadas se conservarán para auditoría, pero no contarán en tus KPIs.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Seguir entrenando</AlertDialogCancel><AlertDialogAction onClick={discard} disabled={pending}>Descartar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </main>
    </div>
  )
}
