"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth, hasBetterAuthEnv } from "@/lib/auth"
import { getSiteUrl } from "@/lib/env"

const loginSchema = z.object({
  email: z.email("Introduce un email válido"),
  password: z.string().min(12, "La contraseña debe tener al menos 12 caracteres"),
})

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect(`/login?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  if (!hasBetterAuthEnv()) redirect("/hoy?demo=1")

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() })
  } catch {
    redirect(`/login?error=${encodeURIComponent("Email o contraseña incorrectos, o email pendiente de verificar")}`)
  }
  redirect("/hoy")
}

export async function logout() {
  if (hasBetterAuthEnv()) await auth.api.signOut({ headers: await headers() })
  redirect("/login")
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.email().safeParse(formData.get("email"))
  if (!email.success) redirect("/recuperar?error=Introduce+un+email+válido")
  if (!hasBetterAuthEnv()) {
    redirect("/recuperar?error=El+servicio+de+autenticación+no+está+configurado")
  }
  await auth.api.requestPasswordReset({
    body: { email: email.data, redirectTo: `${getSiteUrl()}/restablecer` },
    headers: await headers(),
  })
  redirect("/recuperar?sent=1")
}

export async function activatePassword(formData: FormData) {
  const password = z.string().min(12).max(256).safeParse(formData.get("password"))
  if (!password.success) redirect("/activar?error=La+contraseña+debe+tener+entre+12+y+256+caracteres")
  try {
    await auth.api.setPassword({ body: { newPassword: password.data }, headers: await headers() })
  } catch {
    redirect("/activar?error=El+enlace+no+es+válido+o+ha+caducado")
  }
  redirect("/hoy?activated=1")
}

export async function resetPassword(formData: FormData) {
  const parsed = z.object({ token: z.string().min(1), password: z.string().min(12).max(256) }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect("/restablecer?error=La+contraseña+debe+tener+entre+12+y+256+caracteres")
  try {
    await auth.api.resetPassword({ body: { token: parsed.data.token, newPassword: parsed.data.password } })
  } catch {
    redirect("/restablecer?error=El+enlace+no+es+válido+o+ha+caducado")
  }
  redirect("/login?reset=1")
}
