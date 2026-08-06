import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gym Joan · Mejora física",
    short_name: "Gym Joan",
    description: "Planificación y seguimiento de entrenamiento, cardio, nutrición y progreso.",
    start_url: "/hoy",
    display: "standalone",
    background_color: "#f3f6f5",
    theme_color: "#23644f",
    lang: "es-ES",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  }
}
