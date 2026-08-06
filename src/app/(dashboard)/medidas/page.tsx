import Link from "next/link"
import type { ComponentType } from "react"
import { ArrowRightIcon, CalendarDaysIcon, RulerIcon, ScaleIcon } from "lucide-react"
import { PageHeading } from "@/components/dashboard/page-heading"
import { BodyMetricsForm } from "@/components/forms/body-metrics-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getCurrentProfile } from "@/lib/auth"
import { loadBodyMeasurements, type BodyMeasurementRecord } from "@/lib/tracking/body-measurements"

export const metadata = { title: "Medidas" }

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(`${date}T12:00:00`))
}

function measurement(value: number | null, unit: "kg" | "cm") {
  return value === null ? "—" : `${value.toLocaleString("es-ES")} ${unit}`
}

function MeasurementCard({ icon: Icon, label, value, unit }: { icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>; label: string; value: number | null; unit: "kg" | "cm" }) {
  return <Card size="sm"><CardHeader><Icon className="text-muted-foreground" aria-hidden /><CardDescription>{label}</CardDescription><CardTitle className="text-2xl tabular-nums">{measurement(value, unit)}</CardTitle></CardHeader></Card>
}

function LatestMeasurements({ record }: { record: BodyMeasurementRecord }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Último control</CardTitle>
        <CardDescription>Medidas originales, sin indicadores derivados.</CardDescription>
        <Badge variant="secondary">{formatDate(record.measuredOn)}</Badge>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MeasurementCard icon={ScaleIcon} label="Peso" value={record.weight} unit="kg" />
        <MeasurementCard icon={RulerIcon} label="Altura" value={record.height} unit="cm" />
        <MeasurementCard icon={RulerIcon} label="Cintura" value={record.waist} unit="cm" />
        <MeasurementCard icon={RulerIcon} label="Cuello" value={record.neck} unit="cm" />
        {record.hip === null ? null : <MeasurementCard icon={RulerIcon} label="Cadera" value={record.hip} unit="cm" />}
        <MeasurementCard icon={RulerIcon} label="Pecho" value={record.chest} unit="cm" />
        <MeasurementCard icon={RulerIcon} label="Brazo" value={record.arm} unit="cm" />
        <MeasurementCard icon={RulerIcon} label="Muslo" value={record.thigh} unit="cm" />
      </CardContent>
    </Card>
  )
}

export default async function MeasurementsPage() {
  const profile = await getCurrentProfile()
  const records = await loadBodyMeasurements(profile.id)
  const latest = records[0]

  return (
    <>
      <PageHeading
        title="Medidas"
        description="Introduce y consulta tus mediciones corporales originales."
        action={<Button asChild><Link href="/rendimiento">Ver KPIs <ArrowRightIcon data-icon="inline-end" /></Link></Button>}
      />
      <section className="grid items-start gap-4 xl:grid-cols-[minmax(22rem,0.8fr)_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Registrar control</CardTitle><CardDescription>Peso, altura y perímetros medidos con cinta.</CardDescription></CardHeader>
          <CardContent><BodyMetricsForm /></CardContent>
        </Card>
        {latest ? <LatestMeasurements record={latest} /> : (
          <Card><CardHeader><CardTitle>Último control</CardTitle><CardDescription>Aquí aparecerán tus medidas más recientes.</CardDescription></CardHeader><CardContent><Empty><EmptyHeader><EmptyMedia variant="icon"><RulerIcon /></EmptyMedia><EmptyTitle>Sin medidas registradas</EmptyTitle><EmptyDescription>Completa el formulario para crear tu primer control corporal.</EmptyDescription></EmptyHeader></Empty></CardContent></Card>
        )}
      </section>
      <Card>
        <CardHeader><CardTitle>Historial de medidas</CardTitle><CardDescription>Todos los controles guardados en Supabase, del más reciente al más antiguo.</CardDescription></CardHeader>
        <CardContent>
          {records.length ? (
            <Table>
              <TableCaption>{records.length} {records.length === 1 ? "control registrado" : "controles registrados"}</TableCaption>
              <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Sexo fórmula</TableHead><TableHead className="text-right">Peso</TableHead><TableHead className="text-right">Altura</TableHead><TableHead className="text-right">Cintura</TableHead><TableHead className="text-right">Cuello</TableHead><TableHead className="text-right">Cadera</TableHead><TableHead className="text-right">Pecho</TableHead><TableHead className="text-right">Brazo</TableHead><TableHead className="text-right">Muslo</TableHead></TableRow></TableHeader>
              <TableBody>{records.map((record) => (
                <TableRow key={record.measuredOn}>
                  <TableCell className="font-medium"><span className="flex items-center gap-2"><CalendarDaysIcon aria-hidden="true" />{formatDate(record.measuredOn)}</span></TableCell>
                  <TableCell>{record.sex === "male" ? "Hombre" : record.sex === "female" ? "Mujer" : "—"}</TableCell>
                  <TableCell className="text-right">{measurement(record.weight, "kg")}</TableCell><TableCell className="text-right">{measurement(record.height, "cm")}</TableCell><TableCell className="text-right">{measurement(record.waist, "cm")}</TableCell><TableCell className="text-right">{measurement(record.neck, "cm")}</TableCell><TableCell className="text-right">{measurement(record.hip, "cm")}</TableCell><TableCell className="text-right">{measurement(record.chest, "cm")}</TableCell><TableCell className="text-right">{measurement(record.arm, "cm")}</TableCell><TableCell className="text-right">{measurement(record.thigh, "cm")}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          ) : <Empty><EmptyHeader><EmptyMedia variant="icon"><CalendarDaysIcon /></EmptyMedia><EmptyTitle>Historial vacío</EmptyTitle><EmptyDescription>Los controles que registres aparecerán aquí automáticamente.</EmptyDescription></EmptyHeader></Empty>}
        </CardContent>
      </Card>
    </>
  )
}
