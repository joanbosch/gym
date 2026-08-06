import Link from "next/link"
import { ArrowRightIcon, CameraIcon, ScaleIcon, TrendingUpIcon } from "lucide-react"
import { PageHeading } from "@/components/dashboard/page-heading"
import { ProgressChart } from "@/components/progress/progress-chart"
import { ProgressPhotoGallery } from "@/components/progress/progress-photo-gallery"
import { ProgressPhotoUpload } from "@/components/progress/progress-photo-upload"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { getCurrentProfile } from "@/lib/auth"
import { getProgressPhotos } from "@/lib/progress/photos"
import { loadPerformanceDashboard } from "@/lib/training/performance"

export const metadata = { title: "Progreso" }

export default async function ProgressPage() {
  const profile = await getCurrentProfile()
  const [photos, dashboard] = await Promise.all([getProgressPhotos(profile.id), loadPerformanceDashboard()])
  const body = dashboard.bodyKpis
  const latestPhoto = photos[0]
  const photoDetail = latestPhoto
    ? `Última: ${new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(`${latestPhoto.takenOn}T12:00:00`))}`
    : "Aún no hay fotos guardadas"

  const changeText = (value: number | null, unit: string) => {
    if (value === null) return "Sin comparación anterior"
    if (value === 0) return "Sin cambios desde la anterior"
    return `${value > 0 ? "+" : ""}${value.toLocaleString("es-ES")} ${unit} desde la anterior`
  }

  return (
    <>
      <PageHeading title="Progreso" description="Decide con tendencias, no con una sola pesada." action={<ProgressPhotoUpload />} />
      <section className="grid gap-4 sm:grid-cols-3">
        <Card size="sm"><CardHeader><ScaleIcon aria-hidden="true" /><CardDescription>Último peso</CardDescription><CardTitle className="text-2xl">{body.weight === null ? "—" : `${body.weight.toLocaleString("es-ES")} kg`}</CardTitle></CardHeader><CardContent><Badge variant="secondary">{changeText(body.weightChange, "kg")}</Badge></CardContent></Card>
        <Card size="sm"><CardHeader><TrendingUpIcon aria-hidden="true" /><CardDescription>Volumen semanal</CardDescription><CardTitle className="text-2xl">{dashboard.thisWeek.volume.toLocaleString("es-ES")} kg</CardTitle></CardHeader><CardContent><Badge variant="secondary">{dashboard.thisWeek.sets} series completadas</Badge></CardContent></Card>
        <Card size="sm"><CardHeader><CameraIcon aria-hidden="true" /><CardDescription>Fotos guardadas</CardDescription><CardTitle className="text-2xl">{photos.length}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{photoDetail}</p></CardContent></Card>
      </section>
      <Card><CardHeader><CardTitle>Peso y cintura</CardTitle><CardDescription>Evolución de tus controles guardados.</CardDescription></CardHeader><CardContent>{dashboard.bodyTrend.length ? <ProgressChart data={dashboard.bodyTrend} /> : <Empty><EmptyHeader><EmptyMedia variant="icon"><ScaleIcon /></EmptyMedia><EmptyTitle>Sin mediciones</EmptyTitle><EmptyDescription>Añade peso y cintura en Medidas para generar este gráfico.</EmptyDescription></EmptyHeader></Empty>}</CardContent></Card>
      <ProgressPhotoGallery photos={photos} />
      <Card><CardHeader><CardTitle>Fuerza y equilibrio muscular</CardTitle><CardDescription>Consulta niveles personales, 1RM estimado, volumen y progresión sugerida.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href="/rendimiento">Abrir rendimiento <ArrowRightIcon data-icon="inline-end" /></Link></Button></CardContent></Card>
    </>
  )
}
