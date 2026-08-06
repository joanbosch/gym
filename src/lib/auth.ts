import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins/admin"
import { magicLink } from "better-auth/plugins/magic-link"
import { nextCookies } from "better-auth/next-js"
import { passkey } from "@better-auth/passkey"
import { dbPool, hasDatabaseEnv, systemQuery } from "@/lib/db"
import { enqueueAuthEmail } from "@/lib/email/outbox"
import { getSiteUrl } from "@/lib/env"
import type { Profile } from "@/types/domain"

const demoProfile: Profile = {
  id: "00000000-0000-4000-8000-000000000001",
  fullName: "Joan",
  email: "joan@example.com",
  role: "athlete",
  suspended: false,
}

const siteUrl = getSiteUrl()
const siteHost = new URL(siteUrl).hostname
const authSecret = process.env.BETTER_AUTH_SECRET ?? "local-build-only-secret-change-before-deploy"

export const auth = betterAuth({
  appName: "Gym Joan",
  baseURL: siteUrl,
  secret: authSecret,
  database: dbPool,
  trustedOrigins: ["http://localhost:3000", "http://localhost:3001", "https://gym.joanbosch.dev", "https://*.vercel.app"],
  advanced: {
    cookiePrefix: "gym-joan",
    useSecureCookies: process.env.NODE_ENV === "production",
    database: { generateId: "uuid" },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5, strategy: "compact", version: "1" },
  },
  rateLimit: { enabled: true, window: 60, max: 30, storage: "database" },
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.BOOTSTRAP_AUTH !== "1",
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 256,
    resetPasswordTokenExpiresIn: 60 * 30,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) => {
      await enqueueAuthEmail({
        email: user.email,
        name: user.name,
        template: "password_reset",
        subject: "Restablece tu contraseña de Gym Joan",
        actionUrl: url,
        idempotencyKey: `password-reset/${user.id}/${token.slice(0, 16)}`,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: false,
    sendOnSignIn: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url, token }) => {
      await enqueueAuthEmail({
        email: user.email,
        name: user.name,
        template: "email_verification",
        subject: "Verifica tu email en Gym Joan",
        actionUrl: url,
        idempotencyKey: `email-verification/${user.id}/${token.slice(0, 16)}`,
      })
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await systemQuery(
            `insert into public.profiles (id, full_name, email, role)
             values ($1::uuid, $2, lower($3), 'athlete') on conflict (id) do nothing`,
            [user.id, user.name, user.email],
          )
        },
      },
    },
  },
  plugins: [
    admin(),
    magicLink({
      disableSignUp: true,
      expiresIn: 60 * 30,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url, token }) => {
        await enqueueAuthEmail({
          email,
          template: "account_activation",
          subject: "Activa tu acceso a Gym Joan",
          actionUrl: url,
          idempotencyKey: `account-activation/${email.toLowerCase()}/${token.slice(0, 16)}`,
        })
      },
    }),
    passkey({
      rpID: siteHost,
      rpName: "Gym Joan",
      origin: siteUrl,
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
    }),
    nextCookies(),
  ],
})

export type AuthSession = typeof auth.$Infer.Session

export function hasBetterAuthEnv() {
  return hasDatabaseEnv() && Boolean(process.env.BETTER_AUTH_SECRET)
}

export const getAuthSession = cache(async () => {
  if (!hasBetterAuthEnv()) return null
  return auth.api.getSession({ headers: await headers() })
})

export const getCurrentProfile = cache(async (): Promise<Profile> => {
  if (!hasBetterAuthEnv()) return demoProfile
  const session = await getAuthSession()
  if (!session) redirect("/login")
  const result = await systemQuery<{
    id: string
    full_name: string
    email: string
    role: Profile["role"]
    suspended_at: Date | null
  }>("select id::text, full_name, email, role, suspended_at from public.profiles where id = $1::uuid", [session.user.id])
  const profile = result.rows[0]
  if (!profile || profile.suspended_at) redirect("/login?error=Cuenta+suspendida")
  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.role,
    suspended: Boolean(profile.suspended_at),
  }
})

export async function requireRole(roles: Profile["role"][]) {
  const profile = await getCurrentProfile()
  if (!roles.includes(profile.role)) redirect("/hoy")
  return profile
}
