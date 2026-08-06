import { describe, expect, it } from "vitest"
import { calculateAdherence, calculateChange, calculateRirIntensity, calculateTrainingStreak, estimateOneRepMax, getPersonalLevel, getProgressionSuggestion } from "@/lib/training/analytics"

describe("training analytics", () => {
  it("estima el 1RM con Epley", () => expect(estimateOneRepMax(60, 10)).toBe(80))

  it("sube la carga al cerrar el rango con el RIR previsto", () => {
    expect(getProgressionSuggestion({ loadKg: 20, reps: 12, rir: 2, repMin: 8, repMax: 12, targetRir: 2 }).loadKg).toBe(21)
  })

  it("mantiene la carga mientras se acumulan repeticiones", () => {
    expect(getProgressionSuggestion({ loadKg: 20, reps: 10, rir: 2, repMin: 8, repMax: 12, targetRir: 2 }).loadKg).toBe(20)
  })

  it("calcula niveles personales y adherencia", () => {
    expect(getPersonalLevel(11)).toBe("Oro")
    expect(calculateAdherence(5, 6)).toBe(83)
  })

  it("calcula una racha diaria terminada hoy", () => {
    expect(calculateTrainingStreak(["2026-08-04", "2026-08-05", "2026-08-06"], new Date("2026-08-06T12:00:00Z"))).toBe(3)
  })

  it("convierte el RIR en intensidad relativa y calcula cambios", () => {
    expect(calculateRirIntensity(1)).toBe(80)
    expect(calculateRirIntensity(4)).toBe(20)
    expect(calculateChange(84.7, 85.3)).toBe(-0.6)
    expect(calculateChange(null, 85.3)).toBeNull()
  })
})
