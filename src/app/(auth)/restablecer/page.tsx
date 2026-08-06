import { resetPassword } from "@/actions/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export const metadata = { title: "Nueva contraseña" }

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams
  return <Card className="w-full max-w-md"><CardHeader><CardTitle>Crea una nueva contraseña</CardTitle><CardDescription>Al guardarla se cerrarán las demás sesiones activas.</CardDescription></CardHeader><CardContent><form action={resetPassword}><FieldGroup>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<input type="hidden" name="token" value={token ?? ""} /><Field><FieldLabel htmlFor="password">Nueva contraseña</FieldLabel><Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required /><FieldDescription>El enlace caduca a los 30 minutos y solo puede usarse una vez.</FieldDescription></Field><Button type="submit" disabled={!token}>Guardar contraseña</Button></FieldGroup></form></CardContent></Card>
}
