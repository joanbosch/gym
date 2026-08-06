import { BellIcon, CalendarClockIcon, MessageSquareTextIcon } from "lucide-react"
import { PageHeading } from "@/components/dashboard/page-heading"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = { title: "Notificaciones" }

const notifications = [
  { icon: MessageSquareTextIcon, title: "Comentario del entrenador", body: "Buena técnica en el press. Mantén 18 kg hasta completar 10 repeticiones en todas las series.", when: "Hace 2 h", unread: true },
  { icon: CalendarClockIcon, title: "Check-in semanal", body: "El domingo revisaremos peso medio, cintura, sueño y adherencia.", when: "Ayer", unread: false },
  { icon: BellIcon, title: "Plan asignado", body: "Plan híbrido de fuerza y cardio · 12 semanas.", when: "Hace 6 días", unread: false },
]

export default function NotificationsPage() {
  return <><PageHeading title="Notificaciones" description="Cambios de plan, comentarios y recordatorios importantes." /><Card><CardHeader><CardTitle>Bandeja</CardTitle><CardDescription>1 novedad sin leer</CardDescription></CardHeader><CardContent className="flex flex-col gap-2">{notifications.map(({ icon: Icon, title, body, when, unread }) => <article key={title} className="flex gap-3 rounded-lg border p-4"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted"><Icon aria-hidden="true" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{title}</p>{unread ? <Badge>Nueva</Badge> : null}<span className="text-xs text-muted-foreground">{when}</span></div><p className="mt-1 text-sm text-muted-foreground">{body}</p></div></article>)}</CardContent></Card></>
}
