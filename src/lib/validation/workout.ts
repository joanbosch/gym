import { z } from "zod"

export const setLogSchema = z.object({
  id: z.uuid(),
  workoutKey: z.string().min(1),
  sessionId: z.uuid(),
  exerciseId: z.uuid(),
  setNumber: z.int().min(1).max(20),
  loadKg: z.number().min(0).max(1000).nullable(),
  reps: z.int().min(0).max(1000).nullable(),
  rir: z.int().min(0).max(4).nullable(),
  status: z.enum(["pending", "completed", "skipped"]),
  completed: z.boolean(),
  clientChangedAt: z.iso.datetime(),
})

export const setLogsSchema = z.array(setLogSchema).max(200)

export const workoutSnapshotSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("strength").optional(),
  name: z.string().min(1),
  subtitle: z.string(),
  week: z.int().min(1).max(104),
  targetRir: z.string().min(1),
  durationMinutes: z.int().min(1).max(600),
  exercises: z.array(z.object({
    id: z.uuid(), name: z.string().min(1), sets: z.int().min(1).max(20),
    repMin: z.int().min(0).max(1000), repMax: z.int().min(0).max(1000),
    targetRir: z.int().min(0).max(4), restSeconds: z.int().min(0).max(1800),
    cue: z.string(), videoUrl: z.url().optional(), muscleGroup: z.string().optional(), loadSuggestion: z.number().min(0).max(1000).optional(),
    previousLoadKg: z.number().min(0).max(1000).optional(), previousReps: z.int().min(0).max(1000).optional(),
    previousRir: z.int().min(0).max(4).nullable().optional(), estimated1Rm: z.number().min(0).optional(),
    personalLevel: z.enum(["Inicio", "Bronce", "Plata", "Oro", "Diamante"]).optional(), progressionMessage: z.string().optional(),
  })).max(50),
})

export const guidedWorkoutStartSchema = z.object({
  sessionId: z.uuid(),
  startedAt: z.iso.datetime(),
  workout: workoutSnapshotSchema,
})

export const guidedWorkoutFinishSchema = z.object({
  logs: setLogsSchema,
  workout: workoutSnapshotSchema,
  completedAt: z.iso.datetime(),
})

export function calculateVolume(logs: Array<{ loadKg: number | null; reps: number | null; completed: boolean }>) {
  return logs.reduce((total, log) => total + (log.completed ? (log.loadKg ?? 0) * (log.reps ?? 0) : 0), 0)
}

export function averageWeight(values: number[], window = 7) {
  const slice = values.slice(-window)
  if (!slice.length) return null
  return Math.round((slice.reduce((sum, value) => sum + value, 0) / slice.length) * 10) / 10
}
