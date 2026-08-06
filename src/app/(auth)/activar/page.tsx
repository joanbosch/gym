import { activatePassword } from "@/actions/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export const metadata = { title: "Activar cuenta" }

export default async function ActivatePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return <Card className="w-full max-w-md"><CardHeader><CardTitle>Define tu contraseña</CardTitle><CardDescription>Tu email ya está validado. Esta contraseña servirá como método de recuperación aunque después uses Passkeys.</CardDescription></CardHeader><CardContent><form action={activatePassword}><FieldGroup>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<Field><FieldLabel htmlFor="password">Nueva contraseña</FieldLabel><Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required /><FieldDescription>Entre 12 y 256 caracteres.</FieldDescription></Field><Button type="submit">Activar cuenta</Button></FieldGroup></form></CardContent></Card>
}
