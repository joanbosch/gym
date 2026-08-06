export type BiologicalSex = "male" | "female"

export type BodyCompositionInput = {
  sex: BiologicalSex
  weightKg: number
  heightCm: number
  waistCm: number
  neckCm: number
  hipCm?: number
}

export type BodyCompositionEstimate = {
  bmi: number
  bodyFatPercentage: number
  fatMassKg: number
  leanMassKg: number
  waistToHeightRatio: number
}

const round = (value: number, decimals = 1) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function calculateBmi(weightKg: number, heightCm: number) {
  if (weightKg <= 0 || heightCm <= 0) return null
  return round(weightKg / ((heightCm / 100) ** 2))
}

export function estimateBodyFat(input: Omit<BodyCompositionInput, "weightKg">) {
  const { sex, heightCm, waistCm, neckCm, hipCm } = input
  const circumference = sex === "male" ? waistCm - neckCm : waistCm + (hipCm ?? 0) - neckCm
  if (heightCm <= 0 || circumference <= 0 || (sex === "female" && !hipCm)) return null

  const density = sex === "male"
    ? 1.0324 - 0.19077 * Math.log10(circumference) + 0.15456 * Math.log10(heightCm)
    : 1.29579 - 0.35004 * Math.log10(circumference) + 0.221 * Math.log10(heightCm)
  const bodyFatPercentage = 495 / density - 450
  if (!Number.isFinite(bodyFatPercentage) || bodyFatPercentage < 2 || bodyFatPercentage > 70) return null
  return round(bodyFatPercentage)
}

export function calculateBodyComposition(input: BodyCompositionInput): BodyCompositionEstimate | null {
  const bmi = calculateBmi(input.weightKg, input.heightCm)
  const bodyFatPercentage = estimateBodyFat(input)
  if (bmi === null || bodyFatPercentage === null) return null
  return {
    bmi,
    bodyFatPercentage,
    fatMassKg: round(input.weightKg * bodyFatPercentage / 100),
    leanMassKg: round(input.weightKg * (1 - bodyFatPercentage / 100)),
    waistToHeightRatio: round(input.waistCm / input.heightCm, 2),
  }
}
