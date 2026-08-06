"use server"

import { randomBytes } from "node:crypto"
import { headers } from "next/headers"
import { z } from "zod"
import { auth, getAuthSession, hasBetterAuthEnv } from "@/lib/auth"
import { getSiteUrl } from "@/lib/env"
import { systemQuery } from "@/lib/db"
import type { ActionState } from "@/actions/tracking"

const userSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.email(),
  role: z.enum(["admin", "coach", "athlete"]),
})

export async function createManagedUser(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = userSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }
  if (!hasBetterAuthEnv()) return { ok: true, message: "Cuenta creada en modo demostración" }

  const session = await getAuthSession()
  if (!session) return { ok: false, message: "Sesión no válida" }
  const actor = await systemQuery<{ role: string }>("select role::text from public.profiles where id=$1::uuid", [session.user.id])
  if (actor.rows[0]?.role !== "admin") return { ok: false, message: "No tienes permiso para crear cuentas" }

  const requestHeaders = await headers()
  try {
    const created = await auth.api.createUser({
      body: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.fullName,
        password: randomBytes(48).toString("base64url"),
        role: parsed.data.role === "admin" ? "admin" : "user",
      },
      headers: requestHeaders,
    })
    await systemQuery("update public.profiles set full_name=$2, role=$3::public.app_role where id=$1::uuid", [created.user.id, parsed.data.fullName, parsed.data.role])
    await auth.api.signInMagicLink({
      body: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.fullName,
        callbackURL: `${getSiteUrl()}/activar`,
        errorCallbackURL: `${getSiteUrl()}/login?error=El+enlace+de+activación+no+es+válido`,
      },
      headers: requestHeaders,
    })
    await systemQuery(
      "insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values($1::uuid,'user.created','profile',$2::uuid,jsonb_build_object('role',$3::text))",
      [session.user.id, created.user.id, parsed.data.role],
    )
    return { ok: true, message: "Cuenta creada. El enlace de activación está en la cola de correo." }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo crear la cuenta" }
  }
}
