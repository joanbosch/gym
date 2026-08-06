"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CameraIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { progressPhotoViewLabels, progressPhotoViews, type ProgressPhotoView } from "@/types/progress-photo"

type PreparedUpload = { view: ProgressPhotoView; path: string; token: string }

function localDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

async function readResponse(response: Response) {
  const data = await response.json().catch(() => null) as { message?: string } | null
  if (!response.ok) throw new Error(data?.message ?? "No se pudo completar la operación")
  return data
}

export function ProgressPhotoUpload() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const takenOn = String(formData.get("takenOn"))
    const selectedFiles = progressPhotoViews.flatMap((view) => {
      const value = formData.get(view)
      return value instanceof File && value.size > 0 ? [{ view, file: value }] : []
    })
    if (!selectedFiles.length) {
      toast.error("Selecciona al menos una foto")
      return
    }

    setPending(true)
    try {
      const prepareResponse = await fetch("/api/progress-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          takenOn,
          files: selectedFiles.map(({ view, file }) => ({ view, mimeType: file.type, size: file.size })),
        }),
      })
      const prepared = await readResponse(prepareResponse) as { uploads: PreparedUpload[] }
      const filesByView = new Map(selectedFiles.map(({ view, file }) => [view, file]))
      const storage = getSupabaseBrowserClient().storage.from("progress-photos")

      const uploadResults = await Promise.all(prepared.uploads.map(async (upload) => {
        const file = filesByView.get(upload.view)
        if (!file) return { upload, error: "No se encontró el archivo seleccionado" }
        const { error } = await storage.uploadToSignedUrl(upload.path, upload.token, file, {
          cacheControl: "3600",
          contentType: file.type,
        })
        return { upload, error: error?.message }
      }))
      const uploaded = uploadResults.filter((result) => !result.error).map((result) => result.upload)
      const failed = uploadResults.filter((result) => result.error)
      if (!uploaded.length) throw new Error(failed[0]?.error ?? "No se pudo subir ninguna foto")

      const completeResponse = await fetch("/api/progress-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          takenOn,
          uploads: uploaded.map(({ view, path }) => ({ view, path })),
        }),
      })
      await readResponse(completeResponse)
      if (failed.length) {
        toast.warning(`${uploaded.length} ${uploaded.length === 1 ? "foto guardada" : "fotos guardadas"}; ${failed.length} no se pudieron subir`)
      } else {
        toast.success(uploaded.length === 1 ? "Foto guardada" : `${uploaded.length} fotos guardadas`)
      }
      formRef.current?.reset()
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron subir las fotos")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !pending && setOpen(nextOpen)}>
      <DialogTrigger asChild>
        <Button variant="outline"><CameraIcon data-icon="inline-start" />Añadir fotos</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Añadir fotos de progreso</DialogTitle>
          <DialogDescription>Sube una o varias vistas. Las imágenes son privadas y cada archivo puede ocupar hasta 10 MB.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="contents">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="photo-date">Fecha de las fotos</FieldLabel>
              <Input id="photo-date" name="takenOn" type="date" defaultValue={localDate()} max={localDate()} required disabled={pending} />
            </Field>
            {progressPhotoViews.map((view) => (
              <Field key={view}>
                <FieldLabel htmlFor={`photo-${view}`}>{progressPhotoViewLabels[view]}</FieldLabel>
                <Input id={`photo-${view}`} name={view} type="file" accept="image/jpeg,image/png,image/heic,image/webp" disabled={pending} />
                <FieldDescription>JPG, PNG, HEIC o WebP.</FieldDescription>
              </Field>
            ))}
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
              {pending ? "Subiendo…" : "Guardar fotos"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
