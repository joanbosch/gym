import { randomBytes } from "node:crypto"

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim()
  if (!email || !name || !process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) {
    throw new Error("Configura BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, DATABASE_URL y BETTER_AUTH_SECRET")
  }

  process.env.BOOTSTRAP_AUTH = "1"
  const [{ auth }, { systemQuery }, { getSiteUrl }] = await Promise.all([
    import("../src/lib/auth"),
    import("../src/lib/db"),
    import("../src/lib/env"),
  ])
  const result = await auth.api.signUpEmail({
    body: { email, name, password: randomBytes(48).toString("base64url") },
  })
  await systemQuery("update public.profiles set role='admin' where id=$1::uuid", [result.user.id])
  await systemQuery('update "user" set role=\'admin\' where id=$1', [result.user.id])
  await auth.api.signInMagicLink({
    body: {
      email,
      name,
      callbackURL: `${getSiteUrl()}/activar`,
      errorCallbackURL: `${getSiteUrl()}/login?error=El+enlace+de+activación+no+es+válido`,
    },
    headers: new Headers(),
  })
  console.log(`Administrador preparado para ${email}. El enlace de activación está en email_outbox.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
