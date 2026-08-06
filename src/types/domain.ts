export type AppRole = "admin" | "coach" | "athlete"
export type ProgramStatus = "draft" | "published" | "archived"
export type AssignmentStatus = "scheduled" | "active" | "completed" | "cancelled"
export type SessionStatus = "planned" | "in_progress" | "completed" | "skipped"
export type SessionKind = "strength" | "cardio" | "recovery" | "rest" | "checkin"

export interface Profile {
  id: string
  fullName: string
  email: string
  role: AppRole
  suspended: boolean
}

export interface ExercisePrescription {
  id: string
  name: string
  sets: number
  repMin: number
  repMax: number
  targetRir: number
  restSeconds: number
  cue: string
  videoUrl?: string
  muscleGroup?: string
  loadSuggestion?: number
  previousLoadKg?: number
  previousReps?: number
  previousRir?: number | null
  estimated1Rm?: number
  personalLevel?: "Inicio" | "Bronce" | "Plata" | "Oro" | "Diamante"
  progressionMessage?: string
}

export interface PlannedWorkout {
  id: string
  name: string
  subtitle: string
  week: number
  targetRir: string
  durationMinutes: number
  exercises: ExercisePrescription[]
}

export interface SetDraft {
  id: string
  workoutKey: string
  sessionId: string
  exerciseId: string
  setNumber: number
  loadKg: number | null
  reps: number | null
  rir: number | null
  status: "pending" | "completed" | "skipped"
  completed: boolean
  clientChangedAt: string
}

export type GuidedWorkoutSyncState = "active" | "completion_pending" | "synced"

export interface LocalGuidedWorkout {
  workoutKey: string
  sessionId: string
  workout: PlannedWorkout
  startedAt: string
  completedAt: string | null
  currentStep: number
  restEndsAt: string | null
  syncState: GuidedWorkoutSyncState
}

export interface ActiveWorkoutSession {
  sessionId: string
  workout: PlannedWorkout
  startedAt: string
  logs: SetDraft[]
}

export interface ProgressPoint {
  label: string
  weight: number
  waist: number
  volume: number
}

export interface WeeklyTrainingPoint {
  week: string
  volume: number
  sets: number
  sessions: number
  avgRir: number | null
}

export interface BodyTrendPoint {
  date: string
  weight: number | null
  bmi: number | null
  bodyFat: number | null
  waistToHeightRatio: number | null
  height: number | null
  waist: number | null
  neck: number | null
  hip: number | null
  chest: number | null
  arm: number | null
  thigh: number | null
}

export type MuscleRegionKey = "chest" | "back" | "shoulders" | "biceps" | "triceps" | "abs" | "quads" | "hamstrings" | "glutes" | "calves"

export interface MuscleRegionStat {
  key: MuscleRegionKey
  name: string
  trained: boolean
  intensity: number
  sets: number
  volume: number
  sessions: string[]
  improvementPercent: number | null
}

export interface BodyCompositionKpis {
  weight: number | null
  weightChange: number | null
  bmi: number | null
  bodyFat: number | null
  bodyFatChange: number | null
  fatMass: number | null
  leanMass: number | null
  waistToHeightRatio: number | null
  waist: number | null
  waistChange: number | null
  neck: number | null
  hip: number | null
  chest: number | null
  arm: number | null
  thigh: number | null
}
