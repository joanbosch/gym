const productionUrl = "https://gym.joanbosch.dev"

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NODE_ENV === "production" ? productionUrl : "http://localhost:3000"
}

export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error("Faltan las variables públicas de Supabase")
  return { url, key }
}

export function getEmailConfig() {
  return {
    mode: process.env.EMAIL_DELIVERY_MODE ?? "log",
    from: process.env.EMAIL_FROM ?? "Gym Joan <notificaciones@mail.joanbosch.dev>",
    replyTo: process.env.EMAIL_REPLY_TO,
  }
}
