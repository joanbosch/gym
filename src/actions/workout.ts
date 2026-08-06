"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthSession, hasBetterAuthEnv } from "@/lib/auth"
import { systemQuery, withRlsUser } from "@/lib/db"
import { setLogsSchema, workoutSnapshotSchema } from "@/lib/validation/workout"

const sessionIdSchema = z.uuid()

export async function syncSetLogs(input: unknown, snapshotInput: unknown) {
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
        await db.query(
          "insert into public.workout_sessions(id,athlete_id,status,snapshot) values($1::uuid,$2::uuid,'in_progress',$3::jsonb)",
          [sessionId, athleteId, JSON.stringify(strengthSnapshot)],
        )
      }
      for (const log of logs) {
        await db.query(
          `insert into public.set_logs(id,workout_session_id,athlete_id,exercise_id,set_number,load_kg,reps,rir,completed,client_changed_at)
           values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10::timestamptz)
           on conflict(id) do update set load_kg=excluded.load_kg,reps=excluded.reps,rir=excluded.rir,completed=excluded.completed,client_changed_at=excluded.client_changed_at,updated_at=now()
           where public.set_logs.client_changed_at <= excluded.client_changed_at`,
          [log.id, log.sessionId, athleteId, log.exerciseId, log.setNumber, log.loadKg, log.reps, log.rir, log.completed, log.clientChangedAt],
        )
      }
    })
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo sincronizar" }
  }
  revalidatePath("/entrenamiento")
  return { ok: true, synced: logs.length }
}

export async function finishWorkoutSession(input: unknown, snapshotInput: unknown) {
  const logs = setLogsSchema.parse(input)
  const synced = await syncSetLogs(logs, snapshotInput)
  if (!synced.ok || !logs.length || !hasBetterAuthEnv()) return synced
  const session = await getAuthSession()
  if (!session) return { ok: false, error: "Sesión no válida" }
  try {
    await withRlsUser(session.user.id, (db) => db.query(
      "update public.workout_sessions set status='completed',completed_at=now(),updated_at=now() where id=$1::uuid and athlete_id=$2::uuid and status<>'completed'",
      [logs[0].sessionId, session.user.id],
    ))
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo finalizar" }
  }
  revalidatePath("/entrenamiento")
  revalidatePath("/hoy")
  return synced
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
