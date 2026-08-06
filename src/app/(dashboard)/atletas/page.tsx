import { ActivityIcon, MessageSquareTextIcon, UserRoundCheckIcon } from "lucide-react"
import { PageHeading } from "@/components/dashboard/page-heading"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireRole } from "@/lib/auth"

export const metadata = { title: "Atletas" }

export default async function AthletesPage() {
  await requireRole(["admin", "coach"])
  return <><PageHeading title="Atletas" description="Adherencia, señales de recuperación y decisiones pendientes." /><Card><CardHeader><CardTitle>Joan Bosch</CardTitle><CardDescription>Plan híbrido · Semana 1 de 12</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><div className="flex flex-wrap items-center gap-4"><Avatar className="size-12"><AvatarFallback>JB</AvatarFallback></Avatar><div className="flex-1"><p className="font-medium">2 de 6 actividades</p><p className="text-sm text-muted-foreground">Último registro: pádel, ayer</p></div><Badge variant="secondary"><UserRoundCheckIcon data-icon="inline-start" />Semáforo verde</Badge></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border p-3"><p className="text-sm text-muted-foreground">Peso medio</p><p className="text-xl font-semibold">75,8 kg</p></div><div className="rounded-lg border p-3"><p className="text-sm text-muted-foreground">Sueño</p><p className="text-xl font-semibold">7 h 38 min</p></div><div className="rounded-lg border p-3"><p className="text-sm text-muted-foreground">Adherencia</p><p className="text-xl font-semibold">92 %</p></div></div><div className="flex flex-wrap gap-2"><Button><ActivityIcon data-icon="inline-start" />Revisar progreso</Button><Button variant="outline"><MessageSquareTextIcon data-icon="inline-start" />Comentar</Button></div></CardContent></Card></>
}
