"use server"

import { z } from "zod"
import { getAuthSession, hasBetterAuthEnv } from "@/lib/auth"
import { withRlsUser } from "@/lib/db"
import type { ActionState } from "@/actions/tracking"

const programSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500),
  durationWeeks: z.coerce.number().int().min(1).max(52),
})

export async function createProgram(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = programSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }
  if (!hasBetterAuthEnv()) return { ok: true, message: "Borrador creado en modo demostración" }
  const session = await getAuthSession()
  if (!session) return { ok: false, message: "Sesión no válida" }
  try {
    const result = await withRlsUser(session.user.id, (db) => db.query<{ id: string }>(
      "select public.create_program_draft($1,$2,$3) as id",
      [parsed.data.name, parsed.data.description, parsed.data.durationWeeks],
    ))
    if (!result.rows[0]?.id) return { ok: false, message: "No se pudo crear el programa" }
    return { ok: true, message: "Borrador creado correctamente" }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo crear el programa" }
  }
}
