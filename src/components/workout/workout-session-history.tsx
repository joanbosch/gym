"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Clock3Icon, DumbbellIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteWorkoutSession } from "@/actions/workout"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CompletedWorkoutSession } from "@/lib/training/performance"

export function WorkoutSessionHistory({ sessions }: { sessions: CompletedWorkoutSession[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<CompletedWorkoutSession | null>(null)
  const [pending, startTransition] = useTransition()

  const remove = () => {
    if (!selected) return
    startTransition(async () => {
      const result = await deleteWorkoutSession(selected.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setSelected(null)
      toast.success("Sesión eliminada")
      router.refresh()
    })
  }

  if (!sessions.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><DumbbellIcon aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>No hay sesiones completadas</EmptyTitle>
          <EmptyDescription>Las sesiones que finalices aparecerán aquí para que puedas revisarlas o eliminarlas.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Sesión</TableHead><TableHead>Completada</TableHead><TableHead className="text-right">Duración</TableHead><TableHead className="text-right">Series</TableHead><TableHead className="text-right">Volumen</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell className="font-medium">{session.name}</TableCell>
              <TableCell>{session.completedAtLabel}</TableCell>
              <TableCell className="text-right"><span className="inline-flex items-center gap-1"><Clock3Icon className="size-4 text-muted-foreground" aria-hidden="true" />{session.durationMinutes} min</span></TableCell>
              <TableCell className="text-right">{session.completedSets}</TableCell>
              <TableCell className="text-right">{session.volume.toLocaleString("es-ES")} kg</TableCell>
              <TableCell className="text-right"><span className="inline-flex gap-1"><Button asChild variant="ghost" size="icon-sm"><Link href={`/entrenamiento/historial/${session.id}`} aria-label={`Editar sesión ${session.name} del ${session.completedAtLabel}`}><PencilIcon aria-hidden="true" /></Link></Button><Button type="button" variant="ghost" size="icon-sm" aria-label={`Eliminar sesión ${session.name} del ${session.completedAtLabel}`} onClick={() => setSelected(session)}><Trash2Icon aria-hidden="true" /></Button></span></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open && !pending) setSelected(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar sesión completada</DialogTitle>
            <DialogDescription>Se eliminarán “{selected?.name}” y todas sus series registradas. Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={pending}>Cancelar</Button></DialogClose>
            <Button type="button" variant="destructive" disabled={pending} onClick={remove}><Trash2Icon data-icon="inline-start" />{pending ? "Eliminando…" : "Eliminar sesión"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
