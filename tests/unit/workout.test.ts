import { describe, expect, it } from "vitest"
import { deduplicateDrafts } from "@/lib/offline/workout-drafts"
import { averageWeight, calculateVolume, setLogSchema } from "@/lib/validation/workout"
import { getYouTubeEmbedUrl, getYouTubeVideoId } from "@/lib/video"

describe("tracking de entrenamiento", () => {
  it("calcula solo el volumen de series completadas", () => {
    expect(calculateVolume([{ loadKg: 20, reps: 10, completed: true }, { loadKg: 22, reps: 8, completed: false }])).toBe(200)
  })

  it("calcula la media móvil con un decimal", () => {
    expect(averageWeight([76.2, 76, 75.8, 75.7, 75.9, 75.6, 75.5])).toBe(75.8)
  })

  it("rechaza RIR fuera de 0 a 4", () => {
    expect(setLogSchema.safeParse({ id: crypto.randomUUID(), sessionId: "s", exerciseId: "e", setNumber: 1, loadKg: 20, reps: 10, rir: 5, completed: true, clientChangedAt: new Date().toISOString() }).success).toBe(false)
  })
})

describe("borradores offline", () => {
  it("conserva una sola copia lógica de cada serie y prioriza la edición más reciente", () => {
    const base = {
      workoutKey: "upper-a",
      sessionId: "20000000-0000-4000-8000-000000000001",
      exerciseId: "10000000-0000-4000-8000-000000000001",
      setNumber: 1,
      loadKg: null,
      reps: null,
      rir: null,
      completed: false,
    }

    const result = deduplicateDrafts([
      {
        ...base,
        id: "30000000-0000-4000-8000-000000000001",
        clientChangedAt: "2026-08-06T08:00:00.000Z",
      },
      {
        ...base,
        id: "30000000-0000-4000-8000-000000000002",
        loadKg: 20,
        clientChangedAt: "2026-08-06T08:01:00.000Z",
      },
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.loadKg).toBe(20)
  })
})

describe("vídeos de ejercicios", () => {
  it("extrae el identificador de enlaces habituales de YouTube", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=jY0Z6Im2gmU")).toBe("jY0Z6Im2gmU")
    expect(getYouTubeVideoId("https://youtu.be/jY0Z6Im2gmU")).toBe("jY0Z6Im2gmU")
  })

  it("crea un embed con privacidad mejorada y rechaza otros dominios", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/watch?v=jY0Z6Im2gmU")).toBe("https://www.youtube-nocookie.com/embed/jY0Z6Im2gmU?rel=0")
    expect(getYouTubeEmbedUrl("https://example.com/video/jY0Z6Im2gmU")).toBeNull()
  })
})
