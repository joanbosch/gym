"use client"

import { useActionState } from "react"
import { SaveIcon } from "lucide-react"
import { saveNutrition, type ActionState } from "@/actions/tracking"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"

const initialState: ActionState = { ok: false, message: "" }

export function NutritionForm() {
  const [state, action, pending] = useActionState(saveNutrition, initialState)
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())
  const fields = [
    ["calories", "Calorías", "kcal", 2480],
    ["proteinG", "Proteína", "g", 156],
    ["carbsG", "Carbohidratos", "g", 310],
    ["fatG", "Grasas", "g", 68],
    ["waterMl", "Agua", "ml", 2500],
  ] as const
  return (
    <form action={action}>
      <FieldGroup>
        {state.message ? <Alert variant={state.ok ? "default" : "destructive"}><AlertDescription>{state.message}</AlertDescription></Alert> : null}
        <Field><FieldLabel htmlFor="logDate">Fecha</FieldLabel><InputGroup><InputGroupInput id="logDate" name="logDate" type="date" defaultValue={today} required /></InputGroup></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([name, label, unit, defaultValue]) => (
            <Field key={name}><FieldLabel htmlFor={name}>{label}</FieldLabel><InputGroup><InputGroupInput id={name} name={name} type="number" inputMode="decimal" min="0" defaultValue={defaultValue} required /><InputGroupAddon align="inline-end"><InputGroupText>{unit}</InputGroupText></InputGroupAddon></InputGroup></Field>
          ))}
        </div>
        <Button type="submit" disabled={pending}><SaveIcon data-icon="inline-start" />{pending ? "Guardando…" : "Guardar día"}</Button>
      </FieldGroup>
    </form>
  )
}
