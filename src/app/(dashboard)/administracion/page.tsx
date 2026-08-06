import { MailCheckIcon, ShieldCheckIcon, UserCogIcon } from "lucide-react"
import { PageHeading } from "@/components/dashboard/page-heading"
import { AdminUserForm } from "@/components/forms/admin-user-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireRole } from "@/lib/auth"

export const metadata = { title: "Administración" }

export default async function AdminPage() {
  await requireRole(["admin"])
  return <><PageHeading title="Administración" description="Cuentas, roles, relaciones y estado de la infraestructura." action={<Dialog><DialogTrigger asChild><Button><UserCogIcon data-icon="inline-start" />Nueva cuenta</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Crear cuenta gestionada</DialogTitle><DialogDescription>La persona recibirá un enlace seguro para establecer su acceso.</DialogDescription></DialogHeader><AdminUserForm /></DialogContent></Dialog>} /><section className="grid gap-4 sm:grid-cols-3"><Card size="sm"><CardHeader><ShieldCheckIcon aria-hidden="true" /><CardDescription>Seguridad</CardDescription><CardTitle>RLS activa</CardTitle></CardHeader><CardContent><Badge variant="secondary">3 roles</Badge></CardContent></Card><Card size="sm"><CardHeader><MailCheckIcon aria-hidden="true" /><CardDescription>Cola de correo</CardDescription><CardTitle>0 pendientes</CardTitle></CardHeader><CardContent><Badge variant="secondary">Resend</Badge></CardContent></Card><Card size="sm"><CardHeader><UserCogIcon aria-hidden="true" /><CardDescription>Usuarios</CardDescription><CardTitle>3 activos</CardTitle></CardHeader><CardContent><Badge variant="secondary">0 suspendidos</Badge></CardContent></Card></section><Card><CardHeader><CardTitle>Cuentas</CardTitle><CardDescription>Las credenciales nunca se muestran en este panel.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader><TableBody>{[["Joan", "Atleta"],["Entrenador", "Entrenador"],["Administrador", "Administrador"]].map(([name, role]) => <TableRow key={name}><TableCell className="font-medium">{name}</TableCell><TableCell>{role}</TableCell><TableCell><Badge variant="secondary">Activo</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm">Gestionar</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></>
}
