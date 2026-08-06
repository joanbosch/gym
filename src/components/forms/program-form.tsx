"use client"

import { useActionState } from "react"
import { PlusIcon } from "lucide-react"
import { createProgram } from "@/actions/programs"
import type { ActionState } from "@/actions/tracking"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const initial: ActionState = { ok: false, message: "" }

export function ProgramForm() {
  const [state, action, pending] = useActionState(createProgram, initial)
  return <form action={action}><FieldGroup>{state.message ? <Alert variant={state.ok ? "default" : "destructive"}><AlertDescription>{state.message}</AlertDescription></Alert> : null}<Field><FieldLabel htmlFor="name">Nombre</FieldLabel><Input id="name" name="name" placeholder="Ej. Hipertrofia y carrera" required /></Field><Field><FieldLabel htmlFor="description">Descripción</FieldLabel><Textarea id="description" name="description" placeholder="Objetivo y criterios del programa" /><FieldDescription>La primera publicación quedará versionada e inmutable.</FieldDescription></Field><Field><FieldLabel htmlFor="durationWeeks">Duración</FieldLabel><Input id="durationWeeks" name="durationWeeks" type="number" min="1" max="52" defaultValue="12" required /></Field><Button type="submit" disabled={pending}><PlusIcon data-icon="inline-start" />{pending ? "Creando…" : "Crear borrador"}</Button></FieldGroup></form>
}
