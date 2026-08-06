import Link from "next/link"
import { DumbbellIcon, ShieldCheckIcon } from "lucide-react"
import { login } from "@/actions/auth"
import { PasskeyLoginButton } from "@/components/auth/passkey-login-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export const metadata = { title: "Acceder" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>
}) {
  const { error, reset } = await searchParams
  return (
    <div className="flex w-full max-w-md flex-col gap-5">
      <div className="flex items-center justify-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <DumbbellIcon aria-hidden="true" />
        </div>
        <div>
          <p className="text-xl font-semibold">Gym Joan</p>
          <p className="text-sm text-muted-foreground">Entrena con intención</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Accede a tu espacio</CardTitle>
          <CardDescription>Tu plan, tus resultados y el seguimiento de tu entrenador.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login}>
            <FieldGroup>
              {error ? (
                <Alert variant="destructive">
                  <ShieldCheckIcon aria-hidden="true" />
                  <AlertTitle>No se ha podido acceder</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              {reset ? <Alert><ShieldCheckIcon aria-hidden="true" /><AlertTitle>Contraseña actualizada</AlertTitle><AlertDescription>Ya puedes acceder con tu nueva contraseña.</AlertDescription></Alert> : null}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="username webauthn" required />
              </Field>
              <Field>
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                  <Button asChild variant="link" size="sm">
                    <Link href="/recuperar">¿La has olvidado?</Link>
                  </Button>
                </div>
                <Input id="password" name="password" type="password" autoComplete="current-password webauthn" minLength={12} required />
                <FieldDescription>Usa al menos 12 caracteres. En local sin Better Auth configurado se abre el modo demostración.</FieldDescription>
              </Field>
              <Button type="submit" size="lg">Entrar</Button>
              <PasskeyLoginButton />
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Las cuentas las gestiona el administrador.
        </CardFooter>
      </Card>
    </div>
  )
}
