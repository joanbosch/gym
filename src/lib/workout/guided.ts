import type { PlannedWorkout, SetDraft } from "@/types/domain"

export function createGuidedLogs(workout: PlannedWorkout, sessionId: string, changedAt = new Date().toISOString()): SetDraft[] {
  return workout.exercises.flatMap((exercise) => Array.from({ length: exercise.sets }, (_, index) => ({
    id: crypto.randomUUID(),
    workoutKey: workout.id,
    sessionId,
    exerciseId: exercise.id,
    setNumber: index + 1,
    loadKg: null,
    reps: null,
    rir: null,
    status: "pending" as const,
    completed: false,
    clientChangedAt: changedAt,
  })))
}

export function mergeGuidedLogs(local: SetDraft[], remote: SetDraft[]) {
  const byLogicalSet = new Map<string, SetDraft>()
  for (const log of [...remote, ...local]) {
    const key = `${log.exerciseId}:${log.setNumber}`
    const current = byLogicalSet.get(key)
    if (!current || current.clientChangedAt <= log.clientChangedAt) byLogicalSet.set(key, log)
  }
  return Array.from(byLogicalSet.values())
}

export function orderedGuidedLogs(workout: PlannedWorkout, logs: SetDraft[]) {
  const exerciseOrder = new Map(workout.exercises.map((exercise, index) => [exercise.id, index]))
  return [...logs].sort((a, b) => (exerciseOrder.get(a.exerciseId) ?? 999) - (exerciseOrder.get(b.exerciseId) ?? 999) || a.setNumber - b.setNumber)
}

export function firstPendingStep(logs: SetDraft[]) {
  const pending = logs.findIndex((log) => log.status === "pending")
  return pending === -1 ? logs.length : pending
}

export function guidedWorkoutVolume(logs: SetDraft[]) {
  return logs.reduce((total, log) => total + (log.status === "completed" ? (log.loadKg ?? 0) * (log.reps ?? 0) : 0), 0)
}
