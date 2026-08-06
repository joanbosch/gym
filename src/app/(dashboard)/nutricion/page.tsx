import { AppleIcon, DropletsIcon, UtensilsIcon } from "lucide-react"
import { PageHeading } from "@/components/dashboard/page-heading"
import { NutritionForm } from "@/components/forms/nutrition-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export const metadata = { title: "Nutrición" }

export default function NutritionPage() {
  return (
    <>
      <PageHeading title="Nutrición" description="Registra totales diarios sin convertir cada comida en una tarea." />
      <section className="grid gap-4 sm:grid-cols-3">
        <Card size="sm"><CardHeader><AppleIcon aria-hidden="true" /><CardDescription>Energía</CardDescription><CardTitle>2.480 kcal</CardTitle></CardHeader><CardContent><Progress value={96} aria-label="96 % del objetivo" /></CardContent></Card>
        <Card size="sm"><CardHeader><UtensilsIcon aria-hidden="true" /><CardDescription>Proteína</CardDescription><CardTitle>156 g</CardTitle></CardHeader><CardContent><Badge variant="secondary">Objetivo cumplido</Badge></CardContent></Card>
        <Card size="sm"><CardHeader><DropletsIcon aria-hidden="true" /><CardDescription>Agua</CardDescription><CardTitle>2,5 L</CardTitle></CardHeader><CardContent><Progress value={83} aria-label="83 % del objetivo" /></CardContent></Card>
      </section>
      <Card><CardHeader><CardTitle>Registro diario</CardTitle><CardDescription>Día de fuerza o pádel: 2.450–2.600 kcal y 150–170 g de proteína.</CardDescription></CardHeader><CardContent><NutritionForm /></CardContent></Card>
    </>
  )
}
