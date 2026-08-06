import { describe, expect, it } from "vitest"
import { calculateBmi, calculateBodyComposition, estimateBodyFat } from "@/lib/body-composition"

describe("body composition", () => {
  it("calcula IMC y composición masculina desde perímetros", () => {
    expect(calculateBodyComposition({ sex: "male", weightKg: 75, heightCm: 178, waistCm: 84, neckCm: 38 })).toEqual({
      bmi: 23.7,
      bodyFatPercentage: 15.7,
      fatMassKg: 11.8,
      leanMassKg: 63.2,
      waistToHeightRatio: 0.47,
    })
  })

  it("incluye la cadera en la estimación femenina", () => {
    expect(calculateBodyComposition({ sex: "female", weightKg: 62, heightCm: 165, waistCm: 72, neckCm: 32, hipCm: 96 })).toEqual({
      bmi: 22.8,
      bodyFatPercentage: 26.4,
      fatMassKg: 16.4,
      leanMassKg: 45.6,
      waistToHeightRatio: 0.44,
    })
  })

  it("rechaza medidas insuficientes o incompatibles", () => {
    expect(estimateBodyFat({ sex: "female", heightCm: 165, waistCm: 72, neckCm: 32 })).toBeNull()
    expect(estimateBodyFat({ sex: "male", heightCm: 178, waistCm: 35, neckCm: 40 })).toBeNull()
    expect(calculateBmi(0, 178)).toBeNull()
  })
})
