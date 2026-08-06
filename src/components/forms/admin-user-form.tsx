"use client"

import { useActionState } from "react"
import { UserPlusIcon } from "lucide-react"
import { createManagedUser } from "@/actions/admin"
import type { ActionState } from "@/actions/tracking"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const initial: ActionState = { ok: false, message: "" }

export function AdminUserForm() {
  const [state, action, pending] = useActionState(createManagedUser, initial)
  return <form action={action}><FieldGroup>{state.message ? <Alert variant={state.ok ? "default" : "destructive"}><AlertDescription>{state.message}</AlertDescription></Alert> : null}<Field><FieldLabel htmlFor="fullName">Nombre completo</FieldLabel><Input id="fullName" name="fullName" required /></Field><Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" name="email" type="email" required /></Field><Field><FieldLabel htmlFor="role">Rol</FieldLabel><Select name="role" defaultValue="athlete"><SelectTrigger id="role"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="athlete">Atleta</SelectItem><SelectItem value="coach">Entrenador</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectGroup></SelectContent></Select></Field><Button type="submit" disabled={pending}><UserPlusIcon data-icon="inline-start" />{pending ? "Creando…" : "Crear cuenta"}</Button></FieldGroup></form>
}
