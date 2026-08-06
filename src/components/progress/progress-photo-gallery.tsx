import Image from "next/image"
import { ImagesIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { progressPhotoViewLabels, type ProgressPhoto } from "@/types/progress-photo"

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date(`${date}T12:00:00`))
}

export function ProgressPhotoGallery({ photos }: { photos: ProgressPhoto[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fotos de progreso</CardTitle>
        <CardDescription>Comparativas privadas ordenadas desde la más reciente.</CardDescription>
      </CardHeader>
      <CardContent>
        {photos.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo) => (
              <figure key={photo.id} className="flex flex-col gap-2">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={photo.signedUrl}
                    alt={`${progressPhotoViewLabels[photo.view]} del ${formatDate(photo.takenOn)}`}
                    fill
                    sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="text-sm">
                  <span className="font-medium">{progressPhotoViewLabels[photo.view]}</span>
                  <span className="text-muted-foreground"> · {formatDate(photo.takenOn)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><ImagesIcon /></EmptyMedia>
              <EmptyTitle>Aún no hay fotos</EmptyTitle>
              <EmptyDescription>Añade las vistas frontal, lateral o de espalda para empezar tu comparativa.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}
