"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthSession, hasBetterAuthEnv } from "@/lib/auth"
import { systemQuery, withRlsUser } from "@/lib/db"
import { completedWorkoutEditSchema, guidedWorkoutFinishSchema, guidedWorkoutStartSchema, setLogsSchema, workoutSnapshotSchema } from "@/lib/validation/workout"
import { normalizeWorkoutLogs } from "@/lib/workout/guided"
import type { ActiveWorkoutSession, CompletedWorkoutSessionDetail, SetDraft } from "@/types/domain"

const sessionIdSchema = z.uuid()

type ActiveSessionRow = { id: string; snapshot: unknown; started_at: Date }
type CompletedSessionRow = ActiveSessionRow & { completed_at: Date }
type SetLogRow = {
  id: string
  exercise_id: string
  set_number: number
  load_kg: string | null
  reps: number | null
  rir: number | null
  completed: boolean
  skipped: boolean
  client_changed_at: Date
}

async function upsertLogs(db: { query: (text: string, values?: unknown[]) => Promise<unknown> }, athleteId: string, logs: SetDraft[]) {
  for (const log of normalizeWorkoutLogs(logs)) {
    const completed = log.status === "completed"
    const skipped = log.status === "skipped"
    await db.query(
      `insert into public.set_logs(id,workout_session_id,athlete_id,exercise_id,set_number,load_kg,reps,rir,completed,skipped,client_changed_at)
       values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10,$11::timestamptz)
       on conflict(id) do update set load_kg=excluded.load_kg,reps=excluded.reps,rir=excluded.rir,
         completed=excluded.completed,skipped=excluded.skipped,client_changed_at=excluded.client_changed_at,updated_at=now()
       where public.set_logs.client_changed_at <= excluded.client_changed_at`,
      [log.id, log.sessionId, athleteId, log.exerciseId, log.setNumber, log.loadKg, log.reps, log.rir, completed, skipped, log.clientChangedAt],
    )
  }
}

function revalidateWorkoutPaths() {
  revalidatePath("/entrenamiento")
  revalidatePath("/entrenamiento/activo")
  revalidatePath("/hoy")
  revalidatePath("/rendimiento")
  revalidatePath("/progreso")
}

export async function loadActiveWorkoutSession(): Promise<ActiveWorkoutSession | null> {
  if (!hasBetterAuthEnv()) return null
  const session = await getAuthSession()
  if (!session) return null
  return withRlsUser(session.user.id, async (db) => {
    const active = await db.query<ActiveSessionRow>(
      `select id::text,snapshot,started_at
       from public.workout_sessions
       where athlete_id=$1::uuid and status='in_progress' and coalesce(snapshot->>'kind','strength')='strength'
       order by started_at desc limit 1`,
      [session.user.id],
    )
    const row = active.rows[0]
    if (!row) return null
    const parsedWorkout = workoutSnapshotSchema.safeParse(row.snapshot)
    if (!parsedWorkout.success) return null
    const result = await db.query<SetLogRow>(
      `select id::text,exercise_id::text,set_number,load_kg::text,reps,rir,completed,skipped,client_changed_at
       from public.set_logs where workout_session_id=$1::uuid order by created_at,set_number`,
      [row.id],
    )
    return {
      sessionId: row.id,
      workout: parsedWorkout.data,
      startedAt: row.started_at.toISOString(),
      logs: result.rows.map((log) => ({
        id: log.id,
        workoutKey: parsedWorkout.data.id,
        sessionId: row.id,
        exerciseId: log.exercise_id,
        setNumber: log.set_number,
        loadKg: log.load_kg === null ? null : Number(log.load_kg),
        reps: log.reps,
        rir: log.rir,
        status: log.skipped ? "skipped" : log.completed ? "completed" : "pending",
        completed: log.completed,
        clientChangedAt: log.client_changed_at.toISOString(),
      })),
    }
  })
}

export async function loadCompletedWorkoutSession(input: unknown): Promise<CompletedWorkoutSessionDetail | null> {
  const parsedId = sessionIdSchema.safeParse(input)
  if (!parsedId.success || !hasBetterAuthEnv()) return null
  const session = await getAuthSession()
  if (!session) return null

  return withRlsUser(session.user.id, async (db) => {
    const result = await db.query<CompletedSessionRow>(
      `select id::text,snapshot,started_at,coalesce(completed_at,updated_at) completed_at
       from public.workout_sessions
       where id=$1::uuid and athlete_id=$2::uuid and status='completed'
         and coalesce(snapshot->>'kind','strength')='strength'`,
      [parsedId.data, session.user.id],
    )
    const row = result.rows[0]
    if (!row) return null
    const workout = workoutSnapshotSchema.safeParse(row.snapshot)
    if (!workout.success) return null
    const logs = await db.query<SetLogRow>(
      `select id::text,exercise_id::text,set_number,load_kg::text,reps,rir,completed,skipped,client_changed_at
       from public.set_logs where workout_session_id=$1::uuid order by created_at,set_number`,
      [row.id],
    )

    return {
      sessionId: row.id,
      workout: workout.data,
      startedAt: row.started_at.toISOString(),
      completedAt: row.completed_at.toISOString(),
      logs: logs.rows.map((log) => ({
        id: log.id,
        workoutKey: workout.data.id,
        sessionId: row.id,
        exerciseId: log.exercise_id,
        setNumber: log.set_number,
        loadKg: log.load_kg === null ? null : Number(log.load_kg),
        reps: log.reps,
        rir: log.rir,
        status: log.skipped ? "skipped" : log.completed ? "completed" : "skipped",
        completed: log.completed,
        clientChangedAt: log.client_changed_at.toISOString(),
      })),
    }
  })
}

export async function updateCompletedWorkoutSession(input: unknown) {
  const parsed = completedWorkoutEditSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos de entrenamiento no válidos" }
  if (!hasBetterAuthEnv()) return { ok: false as const, error: "No hay sesiones guardadas en el modo demostración" }
  const session = await getAuthSession()
  if (!session) return { ok: false as const, error: "Sesión de usuario no válida" }
  const normalizedLogs = normalizeWorkoutLogs(parsed.data.logs)

  try {
    await withRlsUser(session.user.id, async (db) => {
      const workoutResult = await db.query<{ snapshot: unknown }>(
        `select snapshot from public.workout_sessions
         where id=$1::uuid and athlete_id=$2::uuid and status='completed'
         for update`,
        [parsed.data.sessionId, session.user.id],
      )
      const workout = workoutSnapshotSchema.safeParse(workoutResult.rows[0]?.snapshot)
      if (!workout.success) throw new Error("La sesión no existe, no está completada o no te pertenece")

      const allowedExercises = new Set(workout.data.exercises.map((exercise) => exercise.id))
      const uniqueSets = new Set<string>()
      for (const log of normalizedLogs) {
        if (!allowedExercises.has(log.exerciseId)) throw new Error("Una serie contiene un ejercicio que no pertenece a esta sesión")
        const key = `${log.exerciseId}:${log.setNumber}`
        if (uniqueSets.has(key)) throw new Error("Hay dos series con el mismo número en un ejercicio")
        uniqueSets.add(key)
      }

      const ids = normalizedLogs.map((log) => log.id)
      await db.query(
        `delete from public.set_logs
         where workout_session_id=$1::uuid and athlete_id=$2::uuid and not (id=any($3::uuid[]))`,
        [parsed.data.sessionId, session.user.id, ids],
      )

      for (const log of normalizedLogs) {
        const saved = await db.query(
          `insert into public.set_logs(id,workout_session_id,athlete_id,exercise_id,set_number,load_kg,reps,rir,completed,skipped,client_changed_at)
           values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10,now())
           on conflict(id) do update set exercise_id=excluded.exercise_id,set_number=excluded.set_number,
             load_kg=excluded.load_kg,reps=excluded.reps,rir=excluded.rir,completed=excluded.completed,
             skipped=excluded.skipped,client_changed_at=now(),updated_at=now()
           where public.set_logs.workout_session_id=excluded.workout_session_id
             and public.set_logs.athlete_id=excluded.athlete_id
           returning id`,
          [log.id, parsed.data.sessionId, session.user.id, log.exerciseId, log.setNumber, log.loadKg, log.reps, log.rir, log.status === "completed", log.status === "skipped"],
        )
        if (!saved.rowCount) throw new Error("No se pudo guardar una de las series")
      }

      await db.query(
        "update public.workout_sessions set updated_at=now() where id=$1::uuid and athlete_id=$2::uuid",
        [parsed.data.sessionId, session.user.id],
      )
    })
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "No se pudo actualizar el entrenamiento" }
  }

  revalidateWorkoutPaths()
  return { ok: true as const }
}

export async function startWorkoutSession(input: unknown) {
  const parsed = guidedWorkoutStartSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: "Entrenamiento no válido" }
  if (!hasBetterAuthEnv()) return { ok: true as const, sessionId: parsed.data.sessionId, resumed: false }
  const session = await getAuthSession()
  if (!session) return { ok: false as const, error: "Sesión de usuario no válida" }
  const workout = { ...parsed.data.workout, kind: "strength" as const }
  try {
    return await withRlsUser(session.user.id, async (db) => {
      await db.query("select pg_advisory_xact_lock(hashtext($1))", [session.user.id])
      const active = await db.query<{ id: string }>(
        `select id::text from public.workout_sessions
         where athlete_id=$1::uuid and status='in_progress' and coalesce(snapshot->>'kind','strength')='strength'
         order by started_at desc limit 1`,
        [session.user.id],
      )
      const activeId = active.rows[0]?.id
      if (activeId && activeId !== parsed.data.sessionId) {
        return { ok: false as const, conflict: true as const, activeSessionId: activeId, error: "Ya tienes un entrenamiento activo" }
      }
      if (!activeId) {
        await db.query(
          `insert into public.workout_sessions(id,athlete_id,status,snapshot,started_at)
           values($1::uuid,$2::uuid,'in_progress',$3::jsonb,$4::timestamptz)`,
          [parsed.data.sessionId, session.user.id, JSON.stringify(workout), parsed.data.startedAt],
        )
      }
      return { ok: true as const, sessionId: parsed.data.sessionId, resumed: Boolean(activeId) }
    })
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "No se pudo iniciar el entrenamiento" }
  }
}

export async function syncWorkoutProgress(input: unknown, snapshotInput: unknown) {
  const logs = setLogsSchema.parse(input)
  const snapshot = workoutSnapshotSchema.parse(snapshotInput)
  if (!hasBetterAuthEnv()) return { ok: true, synced: logs.length, demo: true }
  const session = await getAuthSession()
  const athleteId = session?.user.id
  if (!athleteId) return { ok: false, error: "Sesión no válida" }
  if (!logs.length) return { ok: true, synced: 0 }

  const sessionId = logs[0].sessionId
  if (logs.some((log) => log.sessionId !== sessionId)) return { ok: false, error: "Las series pertenecen a sesiones distintas" }
  const strengthSnapshot = { ...snapshot, kind: "strength" as const }
  try {
    await withRlsUser(athleteId, async (db) => {
      const existing = await db.query<{ status: string }>("select status::text from public.workout_sessions where id=$1::uuid", [sessionId])
      if (existing.rows[0]?.status === "completed") throw new Error("Esta sesión ya está finalizada en el servidor")
      if (!existing.rowCount) {
        const otherActive = await db.query<{ id: string }>(
          `select id::text from public.workout_sessions
           where athlete_id=$1::uuid and status='in_progress' and id<>$2::uuid and coalesce(snapshot->>'kind','strength')='strength'
           limit 1`,
          [athleteId, sessionId],
        )
        if (otherActive.rowCount) throw new Error("Hay otro entrenamiento activo en Supabase")
        await db.query(
          "insert into public.workout_sessions(id,athlete_id,status,snapshot) values($1::uuid,$2::uuid,'in_progress',$3::jsonb)",
          [sessionId, athleteId, JSON.stringify(strengthSnapshot)],
        )
      }
      await upsertLogs(db, athleteId, logs)
    })
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo sincronizar" }
  }
  revalidateWorkoutPaths()
  return { ok: true, synced: logs.length }
}

export async function syncSetLogs(input: unknown, snapshotInput: unknown) {
  return syncWorkoutProgress(input, snapshotInput)
}

export async function finishGuidedWorkout(input: unknown) {
  const parsed = guidedWorkoutFinishSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: "Faltan datos válidos para finalizar" }
  const normalizedLogs = normalizeWorkoutLogs(parsed.data.logs, true)
  const completedLogs = normalizedLogs.filter((log) => log.status === "completed")
  if (completedLogs.some((log) => log.loadKg === null || log.reps === null)) {
    return { ok: false as const, error: "Las series completadas necesitan kilos y repeticiones" }
  }
  if (!hasBetterAuthEnv()) return { ok: true as const, synced: normalizedLogs.length }
  const session = await getAuthSession()
  if (!session) return { ok: false as const, error: "Sesión de usuario no válida" }
  const sessionId = normalizedLogs[0]?.sessionId
  if (!sessionId || normalizedLogs.some((log) => log.sessionId !== sessionId)) return { ok: false as const, error: "Las series no pertenecen a la misma sesión" }
  try {
    await withRlsUser(session.user.id, async (db) => {
      const existing = await db.query<{ status: string }>(
        "select status::text from public.workout_sessions where id=$1::uuid and athlete_id=$2::uuid",
        [sessionId, session.user.id],
      )
      if (existing.rows[0]?.status === "completed") return
      if (!existing.rowCount) {
        const otherActive = await db.query<{ id: string }>(
          `select id::text from public.workout_sessions
           where athlete_id=$1::uuid and status='in_progress' and id<>$2::uuid and coalesce(snapshot->>'kind','strength')='strength'
           limit 1`,
          [session.user.id, sessionId],
        )
        if (otherActive.rowCount) throw new Error("Hay otro entrenamiento activo en Supabase")
        await db.query(
          `insert into public.workout_sessions(id,athlete_id,status,snapshot,started_at)
           values($1::uuid,$2::uuid,'in_progress',$3::jsonb,$4::timestamptz)`,
          [sessionId, session.user.id, JSON.stringify({ ...parsed.data.workout, kind: "strength" }), normalizedLogs.map((log) => log.clientChangedAt).sort()[0]],
        )
      }
      await upsertLogs(db, session.user.id, normalizedLogs)
      await db.query(
        `update public.workout_sessions set status='completed',completed_at=$3::timestamptz,updated_at=now()
         where id=$1::uuid and athlete_id=$2::uuid and status='in_progress'`,
        [sessionId, session.user.id, parsed.data.completedAt],
      )
    })
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "No se pudo finalizar" }
  }
  revalidateWorkoutPaths()
  return { ok: true as const, synced: normalizedLogs.length }
}

export async function finishWorkoutSession(input: unknown, snapshotInput: unknown) {
  const logs = setLogsSchema.parse(input)
  return finishGuidedWorkout({ logs, workout: snapshotInput, completedAt: new Date().toISOString() })
}

export async function discardWorkoutSession(input: unknown) {
  const parsed = sessionIdSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: "Sesión no válida" }
  if (!hasBetterAuthEnv()) return { ok: true as const }
  const session = await getAuthSession()
  if (!session) return { ok: false as const, error: "Sesión de usuario no válida" }
  try {
    await withRlsUser(session.user.id, (db) => db.query(
      `update public.workout_sessions set status='skipped',updated_at=now()
       where id=$1::uuid and athlete_id=$2::uuid and status='in_progress'`,
      [parsed.data, session.user.id],
    ))
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "No se pudo descartar" }
  }
  revalidateWorkoutPaths()
  return { ok: true as const }
}

export async function deleteWorkoutSession(input: unknown) {
  const parsed = sessionIdSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Sesión no válida" }
  if (!hasBetterAuthEnv()) return { ok: false, error: "No hay sesiones guardadas en el modo demostración" }

  const session = await getAuthSession()
  if (!session) return { ok: false, error: "Sesión de usuario no válida" }

  try {
    const scheduledSessionId = await withRlsUser(session.user.id, async (db) => {
      const result = await db.query<{ scheduled_session_id: string | null }>(
        `delete from public.workout_sessions
         where id=$1::uuid and athlete_id=$2::uuid and status='completed'
         returning scheduled_session_id::text`,
        [parsed.data, session.user.id],
      )
      return result.rows[0]?.scheduled_session_id
    })

    if (scheduledSessionId === undefined) return { ok: false, error: "La sesión no existe, no está completada o no te pertenece" }
    if (scheduledSessionId) {
      await systemQuery(
        `update public.scheduled_sessions set status='planned'
         where id=$1::uuid and athlete_id=$2::uuid and status='completed'`,
        [scheduledSessionId, session.user.id],
      )
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo eliminar la sesión" }
  }

  revalidatePath("/rendimiento")
  revalidatePath("/progreso")
  revalidatePath("/hoy")
  revalidatePath("/calendario")
  return { ok: true }
}
