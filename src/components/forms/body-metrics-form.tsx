"use client"

import { useActionState, useMemo, useState } from "react"
import { CalculatorIcon, RulerIcon, SaveIcon, ScaleIcon } from "lucide-react"
import { saveBodyMetrics, type ActionState } from "@/actions/tracking"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { calculateBodyComposition, type BiologicalSex } from "@/lib/body-composition"

const initialState: ActionState = { ok: false, message: "" }

type FormValues = {
  sex: BiologicalSex
  weight: string
  height: string
  waist: string
  neck: string
  hip: string
}

function MetricInput({ name, label, min, max, icon: Icon, required, value, onChange }: {
  name: keyof Omit<FormValues, "sex"> | "chest" | "arm" | "thigh"
  label: string
  min: number
  max: number
  icon: typeof RulerIcon
  required?: boolean
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={name}><Icon aria-hidden="true" />{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={name}
          name={name}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step="0.1"
          required={required}
          value={value}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        />
        <InputGroupAddon align="inline-end"><InputGroupText>{name === "weight" ? "kg" : "cm"}</InputGroupText></InputGroupAddon>
      </InputGroup>
    </Field>
  )
}

export function BodyMetricsForm() {
  const [state, action, pending] = useActionState(saveBodyMetrics, initialState)
  const [values, setValues] = useState<FormValues>({ sex: "male", weight: "", height: "", waist: "", neck: "", hip: "" })
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())
  const setValue = (name: keyof FormValues, value: string) => setValues((current) => ({ ...current, [name]: value }))
  const estimate = useMemo(() => calculateBodyComposition({
    sex: values.sex,
    weightKg: Number(values.weight),
    heightCm: Number(values.height),
    waistCm: Number(values.waist),
    neckCm: Number(values.neck),
    hipCm: values.hip ? Number(values.hip) : undefined,
  }), [values])

  return (
    <form action={action}>
      <FieldGroup>
        {state.message ? <Alert variant={state.ok ? "default" : "destructive"}><AlertDescription>{state.message}</AlertDescription></Alert> : null}
        <Alert>
          <CalculatorIcon aria-hidden="true" />
          <AlertTitle>Estimación automática</AlertTitle>
          <AlertDescription>Calculamos grasa corporal por perímetros e IMC con peso y altura. Son indicadores orientativos, no un diagnóstico médico.</AlertDescription>
        </Alert>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field><FieldLabel htmlFor="measuredOn">Fecha</FieldLabel><InputGroup><InputGroupInput id="measuredOn" name="measuredOn" type="date" defaultValue={today} max={today} required disabled={pending} /></InputGroup></Field>
          <Field>
            <FieldLabel htmlFor="sex">Sexo utilizado por la fórmula</FieldLabel>
            <Select name="sex" value={values.sex} onValueChange={(value) => setValue("sex", value as BiologicalSex)} disabled={pending}>
              <SelectTrigger id="sex" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="male">Hombre</SelectItem><SelectItem value="female">Mujer</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
          <MetricInput name="weight" label="Peso" min={20} max={400} icon={ScaleIcon} required value={values.weight} onChange={(value) => setValue("weight", value)} />
          <MetricInput name="height" label="Altura" min={100} max={250} icon={RulerIcon} required value={values.height} onChange={(value) => setValue("height", value)} />
          <MetricInput name="waist" label={values.sex === "male" ? "Cintura a la altura del ombligo" : "Cintura natural"} min={30} max={250} icon={RulerIcon} required value={values.waist} onChange={(value) => setValue("waist", value)} />
          <MetricInput name="neck" label="Cuello" min={20} max={80} icon={RulerIcon} required value={values.neck} onChange={(value) => setValue("neck", value)} />
          {values.sex === "female" ? <MetricInput name="hip" label="Cadera" min={40} max={250} icon={RulerIcon} required value={values.hip} onChange={(value) => setValue("hip", value)} /> : null}
        </div>
        <FieldDescription>Mide los perímetros con la cinta horizontal, sin comprimir la piel y después de una espiración relajada.</FieldDescription>
        {estimate ? (
          <Alert>
            <CalculatorIcon aria-hidden="true" />
            <AlertTitle>Vista previa</AlertTitle>
            <AlertDescription>
              Grasa {estimate.bodyFatPercentage.toLocaleString("es-ES")}% · IMC {estimate.bmi.toLocaleString("es-ES")} · Masa grasa {estimate.fatMassKg.toLocaleString("es-ES")} kg · Masa magra {estimate.leanMassKg.toLocaleString("es-ES")} kg · Cintura/altura {estimate.waistToHeightRatio.toLocaleString("es-ES")}
            </AlertDescription>
          </Alert>
        ) : null}
        <FieldSeparator>Perímetros opcionales</FieldSeparator>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricInput name="chest" label="Pecho" min={30} max={250} icon={RulerIcon} />
          <MetricInput name="arm" label="Brazo" min={10} max={100} icon={RulerIcon} />
          <MetricInput name="thigh" label="Muslo" min={20} max={150} icon={RulerIcon} />
        </div>
        <Button type="submit" disabled={pending || !estimate}>
          {pending ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
          {pending ? "Guardando…" : "Guardar y calcular"}
        </Button>
      </FieldGroup>
    </form>
  )
}
