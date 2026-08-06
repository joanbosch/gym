import "server-only"

import { getAuthSession, hasBetterAuthEnv } from "@/lib/auth"
import { calculateBmi } from "@/lib/body-composition"
import { systemQuery } from "@/lib/db"
import { calculateChange, calculateRirIntensity, calculateTrainingStreak, estimateOneRepMax, getPersonalLevel, getProgressionSuggestion } from "@/lib/training/analytics"
import type { BodyCompositionKpis, BodyTrendPoint, ExercisePrescription, MuscleRegionKey, MuscleRegionStat, PlannedWorkout, WeeklyTrainingPoint } from "@/types/domain"

type PerformanceSet = {
  exercise_id: string
  name: string
  muscle_group: string
  load_kg: string
  reps: number
  rir: number | null
  completed_at: Date
}

export type ExercisePerformance = {
  exerciseId: string
  name: string
  muscleGroup: string
  bestE1rm: number
  baselineE1rm: number
  improvementPercent: number
  level: ReturnType<typeof getPersonalLevel>
  previousLoadKg: number
  previousReps: number
  previousRir: number | null
  totalVolume: number
  completedSets: number
}

export type CompletedWorkoutSession = {
  id: string
  name: string
  completedAtLabel: string
  durationMinutes: number
  completedSets: number
  volume: number
}

type MuscleWeekRow = {
  muscle_group: string
  completed_sets: string
  volume: string
  avg_rir: string | null
  session_names: string[] | null
  current_e1rm: string | null
  previous_e1rm: string | null
}

const muscleRegions: Array<{ key: MuscleRegionKey; name: string; groups: string[] }> = [
  { key: "chest", name: "Pecho", groups: ["Pecho"] },
  { key: "back", name: "Espalda", groups: ["Espalda", "Estabilidad escapular"] },
  { key: "shoulders", name: "Hombros", groups: ["Hombros", "Hombro posterior"] },
  { key: "biceps", name: "Bíceps", groups: ["Bíceps"] },
  { key: "triceps", name: "Tríceps", groups: ["Tríceps"] },
  { key: "abs", name: "Core", groups: ["Core"] },
  { key: "quads", name: "Cuádriceps", groups: ["Piernas"] },
  { key: "hamstrings", name: "Isquios", groups: ["Isquios"] },
  { key: "glutes", name: "Glúteos", groups: ["Glúteos"] },
  { key: "calves", name: "Gemelos", groups: ["Gemelos"] },
]

function buildMuscleRegionStats(rows: MuscleWeekRow[]): MuscleRegionStat[] {
  return muscleRegions.map((region) => {
    const matches = rows.filter((row) => region.groups.includes(row.muscle_group))
    const sets = matches.reduce((sum, row) => sum + Number(row.completed_sets), 0)
    const volume = Math.round(matches.reduce((sum, row) => sum + Number(row.volume), 0))
    const weightedIntensity = matches.reduce((sum, row) => sum + calculateRirIntensity(row.avg_rir === null ? null : Number(row.avg_rir)) * Number(row.completed_sets), 0)
    const sessions = Array.from(new Set(matches.flatMap((row) => row.session_names ?? [])))
    const current = Math.max(0, ...matches.map((row) => Number(row.current_e1rm ?? 0)))
    const previous = Math.max(0, ...matches.map((row) => Number(row.previous_e1rm ?? 0)))
    return {
      key: region.key,
      name: region.name,
      trained: sets > 0,
      intensity: sets ? Math.round(weightedIntensity / sets) : 0,
      sets,
      volume,
      sessions,
      improvementPercent: current > 0 && previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null,
    }
  })
}

function latestValues(points: BodyTrendPoint[]): BodyCompositionKpis {
  const values = (key: Exclude<keyof BodyTrendPoint, "date">) => points.map((point) => point[key]).filter((value): value is number => typeof value === "number")
  const weight = values("weight")
  const bodyFat = values("bodyFat")
  const waist = values("waist")
  const latestWeight = weight.at(-1) ?? null
  const latestBodyFat = bodyFat.at(-1) ?? null
  return {
    weight: latestWeight,
    weightChange: calculateChange(latestWeight, weight.at(-2) ?? null),
    bmi: values("bmi").at(-1) ?? null,
    bodyFat: latestBodyFat,
    bodyFatChange: calculateChange(latestBodyFat, bodyFat.at(-2) ?? null),
    fatMass: latestWeight !== null && latestBodyFat !== null ? Math.round(latestWeight * latestBodyFat / 100 * 10) / 10 : null,
    leanMass: latestWeight !== null && latestBodyFat !== null ? Math.round(latestWeight * (1 - latestBodyFat / 100) * 10) / 10 : null,
    waistToHeightRatio: values("waistToHeightRatio").at(-1) ?? null,
    waist: waist.at(-1) ?? null,
    waistChange: calculateChange(waist.at(-1) ?? null, waist.at(-2) ?? null),
    neck: values("neck").at(-1) ?? null,
    hip: values("hip").at(-1) ?? null,
    chest: values("chest").at(-1) ?? null,
    arm: values("arm").at(-1) ?? null,
    thigh: values("thigh").at(-1) ?? null,
  }
}

function emptyDashboard() {
  const bodyTrend: BodyTrendPoint[] = []
  const muscleStats = buildMuscleRegionStats([])
  return {
    exercises: [] as ExercisePerformance[],
    completedSessions: 0,
    streak: 0,
    sessions: [] as CompletedWorkoutSession[],
    weeklyTrends: [] as WeeklyTrainingPoint[],
    muscleStats,
    bodyTrend,
    bodyKpis: latestValues(bodyTrend),
    thisWeek: { sessions: 0, sets: 0, volume: 0, avgRir: null, activeMuscles: 0, improvement: 0 },
  }
}

export async function loadExercisePerformance(exerciseIds?: string[]) {
  if (!hasBetterAuthEnv()) return [] as ExercisePerformance[]
  const session = await getAuthSession()
  if (!session) return [] as ExercisePerformance[]
  const values: unknown[] = [session.user.id]
  const filter = exerciseIds?.length ? (values.push(exerciseIds), "and sl.exercise_id = any($2::uuid[])") : ""
  const result = await systemQuery<PerformanceSet>(
    `select sl.exercise_id::text,e.name,e.muscle_group,sl.load_kg::text,sl.reps,sl.rir,
            coalesce(ws.completed_at,sl.created_at) completed_at
     from public.set_logs sl
     join public.exercises e on e.id=sl.exercise_id
     join public.workout_sessions ws on ws.id=sl.workout_session_id
     where sl.athlete_id=$1::uuid and ws.status='completed' and sl.completed and sl.load_kg is not null and sl.reps is not null
       and coalesce(ws.snapshot->>'kind','strength')='strength'
       and not exists (
         select 1 from public.scheduled_sessions ss
         where ss.id=ws.scheduled_session_id and ss.kind<>'strength'
       )
       ${filter}
     order by sl.exercise_id,coalesce(ws.completed_at,sl.created_at),sl.set_number`,
    values,
  )
  const grouped = new Map<string, PerformanceSet[]>()
  for (const row of result.rows) grouped.set(row.exercise_id, [...(grouped.get(row.exercise_id) ?? []), row])
  return Array.from(grouped.values()).map((sets) => {
    const first = sets[0]
    const last = sets.at(-1)!
    const estimates = sets.map((set) => estimateOneRepMax(Number(set.load_kg), set.reps))
    const baselineE1rm = estimates[0]
    const bestE1rm = Math.max(...estimates)
    const improvementPercent = baselineE1rm > 0 ? Math.round(((bestE1rm - baselineE1rm) / baselineE1rm) * 1000) / 10 : 0
    return {
      exerciseId: first.exercise_id,
      name: first.name,
      muscleGroup: first.muscle_group,
      bestE1rm,
      baselineE1rm,
      improvementPercent,
      level: getPersonalLevel(improvementPercent),
      previousLoadKg: Number(last.load_kg),
      previousReps: last.reps,
      previousRir: last.rir,
      totalVolume: Math.round(sets.reduce((sum, set) => sum + Number(set.load_kg) * set.reps, 0)),
      completedSets: sets.length,
    }
  })
}

export async function enrichWorkoutWithPerformance(workout: PlannedWorkout): Promise<PlannedWorkout> {
  const performance = await loadExercisePerformance(workout.exercises.map((exercise) => exercise.id))
  const byExercise = new Map(performance.map((item) => [item.exerciseId, item]))
  return {
    ...workout,
    exercises: workout.exercises.map((exercise): ExercisePrescription => {
      const previous = byExercise.get(exercise.id)
      if (!previous) return exercise
      const suggestion = getProgressionSuggestion({
        loadKg: previous.previousLoadKg,
        reps: previous.previousReps,
        rir: previous.previousRir,
        repMin: exercise.repMin,
        repMax: exercise.repMax,
        targetRir: exercise.targetRir,
      })
      return {
        ...exercise,
        muscleGroup: previous.muscleGroup,
        previousLoadKg: previous.previousLoadKg,
        previousReps: previous.previousReps,
        previousRir: previous.previousRir,
        estimated1Rm: previous.bestE1rm,
        personalLevel: previous.level,
        loadSuggestion: suggestion.loadKg ?? undefined,
        progressionMessage: suggestion.message,
      }
    }),
  }
}

export async function loadPerformanceDashboard() {
  const exercises = await loadExercisePerformance()
  if (!hasBetterAuthEnv()) return emptyDashboard()
  const session = await getAuthSession()
  if (!session) return emptyDashboard()
  const bodyFatColumn = await systemQuery<{ exists: boolean }>(
    `select exists(select 1 from information_schema.columns where table_schema='public' and table_name='body_measurements' and column_name='body_fat_percentage')`,
  )
  const bodyFatExpression = bodyFatColumn.rows[0]?.exists ? "b.body_fat_percentage::text" : "null::text"
  const [sessionsResult, weeklyResult, muscleResult, bodyResult] = await Promise.all([systemQuery<{
    id: string
    name: string
    started_at: Date
    completed_at: Date
    completed_sets: string
    volume: string
  }>(
    `select ws.id::text,coalesce(nullif(ws.snapshot->>'name',''),'Sesión') name,ws.started_at,coalesce(ws.completed_at,ws.updated_at) completed_at,
            count(sl.id) filter (where sl.completed)::text completed_sets,
            coalesce(sum(sl.load_kg * sl.reps) filter (where sl.completed),0)::text volume
     from public.workout_sessions ws
     left join public.set_logs sl on sl.workout_session_id=ws.id
     where ws.athlete_id=$1::uuid and ws.status='completed'
       and coalesce(ws.snapshot->>'kind','strength')='strength'
       and not exists (
         select 1 from public.scheduled_sessions ss
         where ss.id=ws.scheduled_session_id and ss.kind<>'strength'
       )
       and exists (
         select 1 from public.set_logs strength_log
         where strength_log.workout_session_id=ws.id and strength_log.completed
       )
     group by ws.id
     order by coalesce(ws.completed_at,ws.updated_at) desc`,
    [session.user.id],
  ), systemQuery<{ week_start: Date; volume: string; completed_sets: string; sessions: string; avg_rir: string | null }>(
    `select date_trunc('week',coalesce(ws.completed_at,sl.created_at) at time zone 'Europe/Madrid') week_start,
            coalesce(sum(sl.load_kg*sl.reps),0)::text volume,count(*)::text completed_sets,
            count(distinct ws.id)::text sessions,round(avg(sl.rir)::numeric,1)::text avg_rir
     from public.set_logs sl join public.workout_sessions ws on ws.id=sl.workout_session_id
     where sl.athlete_id=$1::uuid and ws.status='completed' and sl.completed
       and coalesce(ws.snapshot->>'kind','strength')='strength'
       and not exists (
         select 1 from public.scheduled_sessions ss
         where ss.id=ws.scheduled_session_id and ss.kind<>'strength'
       )
       and coalesce(ws.completed_at,sl.created_at) >= now()-interval '12 weeks'
     group by 1 order by 1`, [session.user.id],
  ), systemQuery<MuscleWeekRow>(
    `with logs as (
       select e.muscle_group,coalesce(ws.snapshot->>'name','Sesión') session_name,sl.load_kg,sl.reps,sl.rir,
              coalesce(ws.completed_at,sl.created_at) performed_at,
              case when sl.load_kg is not null and sl.reps is not null then sl.load_kg*(1+least(sl.reps,30)/30.0) end e1rm
       from public.set_logs sl join public.workout_sessions ws on ws.id=sl.workout_session_id join public.exercises e on e.id=sl.exercise_id
       where sl.athlete_id=$1::uuid and ws.status='completed' and sl.completed
         and coalesce(ws.snapshot->>'kind','strength')='strength'
         and not exists (
           select 1 from public.scheduled_sessions ss
           where ss.id=ws.scheduled_session_id and ss.kind<>'strength'
         )
     ), boundary as (select date_trunc('week',now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid' starts_at)
     select muscle_group,count(*) filter(where performed_at>=starts_at)::text completed_sets,
            coalesce(sum(load_kg*reps) filter(where performed_at>=starts_at),0)::text volume,
            round(avg(rir) filter(where performed_at>=starts_at)::numeric,1)::text avg_rir,
            array_agg(distinct session_name) filter(where performed_at>=starts_at) session_names,
            max(e1rm) filter(where performed_at>=starts_at)::text current_e1rm,
            max(e1rm) filter(where performed_at<starts_at)::text previous_e1rm
     from logs cross join boundary group by muscle_group`, [session.user.id],
  ), systemQuery<{ measured_on: Date; weight: string | null; body_fat: string | null; height: string | null; waist: string | null; neck: string | null; hip: string | null; chest: string | null; arm: string | null; thigh: string | null }>(
    `select coalesce(w.measured_on,b.measured_on) measured_on,w.weight_kg::text weight,${bodyFatExpression} body_fat,
            b.height_cm::text height,b.waist_cm::text waist,b.neck_cm::text neck,b.hip_cm::text hip,
            b.chest_cm::text chest,b.arm_cm::text arm,b.thigh_cm::text thigh
     from public.weigh_ins w full join public.body_measurements b on b.athlete_id=w.athlete_id and b.measured_on=w.measured_on
     where coalesce(w.athlete_id,b.athlete_id)=$1::uuid order by 1`, [session.user.id],
  )])
  const dateFormatter = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" })
  const sessions = sessionsResult.rows.map((row): CompletedWorkoutSession => ({
    id: row.id,
    name: row.name,
    completedAtLabel: dateFormatter.format(row.completed_at),
    durationMinutes: Math.max(1, Math.round((row.completed_at.getTime() - row.started_at.getTime()) / 60_000)),
    completedSets: Number(row.completed_sets),
    volume: Number(row.volume),
  }))
  const dates = sessionsResult.rows.map((row) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(row.completed_at))
  const weekFormatter = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" })
  const weeklyTrends: WeeklyTrainingPoint[] = weeklyResult.rows.map((row) => ({ week: weekFormatter.format(row.week_start), volume: Math.round(Number(row.volume)), sets: Number(row.completed_sets), sessions: Number(row.sessions), avgRir: row.avg_rir === null ? null : Number(row.avg_rir) }))
  const bodyTrend: BodyTrendPoint[] = bodyResult.rows.map((row) => {
    const weight = row.weight === null ? null : Number(row.weight)
    const height = row.height === null ? null : Number(row.height)
    const waist = row.waist === null ? null : Number(row.waist)
    return {
      date: weekFormatter.format(row.measured_on),
      weight,
      bmi: weight !== null && height !== null ? calculateBmi(weight, height) : null,
      bodyFat: row.body_fat === null ? null : Number(row.body_fat),
      waistToHeightRatio: waist !== null && height !== null ? Math.round(waist / height * 100) / 100 : null,
      height,
      waist,
      neck: row.neck === null ? null : Number(row.neck),
      hip: row.hip === null ? null : Number(row.hip),
      chest: row.chest === null ? null : Number(row.chest),
      arm: row.arm === null ? null : Number(row.arm),
      thigh: row.thigh === null ? null : Number(row.thigh),
    }
  })
  const muscleStats = buildMuscleRegionStats(muscleResult.rows)
  const latestWeek = weeklyTrends.at(-1)
  const improvements = exercises.map((item) => item.improvementPercent).filter((value) => value > 0)
  return {
    exercises: exercises.sort((a, b) => b.bestE1rm - a.bestE1rm), completedSessions: dates.length, streak: calculateTrainingStreak(dates), sessions,
    weeklyTrends, muscleStats, bodyTrend, bodyKpis: latestValues(bodyTrend),
    thisWeek: { sessions: latestWeek?.sessions ?? 0, sets: latestWeek?.sets ?? 0, volume: latestWeek?.volume ?? 0, avgRir: latestWeek?.avgRir ?? null, activeMuscles: muscleStats.filter((item) => item.trained).length, improvement: improvements.length ? Math.round(improvements.reduce((sum, value) => sum + value, 0) / improvements.length * 10) / 10 : 0 },
  }
}
