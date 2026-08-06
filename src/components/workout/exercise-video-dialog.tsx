"use client"

import { ExternalLinkIcon, VideoIcon } from "lucide-react"
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
import { getYouTubeEmbedUrl } from "@/lib/video"

export function ExerciseVideoDialog({ name, videoUrl }: { name: string; videoUrl: string }) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <VideoIcon data-icon="inline-start" />
          Ver técnica
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>Observa la colocación, el recorrido y el control antes de empezar tus series.</DialogDescription>
        </DialogHeader>
        {embedUrl ? (
          <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
            <iframe
              className="size-full"
              src={embedUrl}
              title={`Técnica de ${name}`}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button asChild variant="outline">
            <a href={videoUrl} target="_blank" rel="noreferrer">
              <ExternalLinkIcon data-icon="inline-start" />
              Abrir en YouTube
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
