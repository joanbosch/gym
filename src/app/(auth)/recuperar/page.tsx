import Link from "next/link"
import { CheckCircle2Icon } from "lucide-react"
import { requestPasswordReset } from "@/actions/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export const metadata = { title: "Recuperar acceso" }

export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { error, sent } = await searchParams
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Recupera tu acceso</CardTitle>
        <CardDescription>Te enviaremos un enlace seguro para definir una nueva contraseña.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={requestPasswordReset}>
          <FieldGroup>
            {sent ? (
              <Alert>
                <CheckCircle2Icon aria-hidden="true" />
                <AlertTitle>Revisa tu correo</AlertTitle>
                <AlertDescription>Si la cuenta existe, recibirás el enlace en unos minutos.</AlertDescription>
              </Alert>
            ) : null}
            {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Button type="submit">Enviar enlace</Button>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full"><Link href="/login">Volver al acceso</Link></Button>
      </CardFooter>
    </Card>
  )
}
