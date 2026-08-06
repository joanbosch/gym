export type PersonalLevel = "Inicio" | "Bronce" | "Plata" | "Oro" | "Diamante"

export function estimateOneRepMax(loadKg: number, reps: number) {
  if (loadKg <= 0 || reps <= 0) return 0
  if (reps === 1) return Math.round(loadKg * 10) / 10
  return Math.round(loadKg * (1 + Math.min(reps, 30) / 30) * 10) / 10
}

export function getPersonalLevel(improvementPercent: number): PersonalLevel {
  if (improvementPercent >= 20) return "Diamante"
  if (improvementPercent >= 10) return "Oro"
  if (improvementPercent >= 5) return "Plata"
  if (improvementPercent >= 2) return "Bronce"
  return "Inicio"
}

export function getProgressionSuggestion(input: {
  loadKg: number
  reps: number
  rir: number | null
  repMin: number
  repMax: number
  targetRir: number
}) {
  const { loadKg, reps, rir, repMin, repMax, targetRir } = input
  if (loadKg <= 0) return { loadKg: null, message: "Empieza con una carga técnica y deja las repeticiones previstas en reserva." }
  if (reps >= repMax && rir !== null && rir >= targetRir) {
    const increment = Math.max(1, loadKg * 0.025)
    const next = Math.round((loadKg + increment) * 2) / 2
    return { loadKg: next, message: `Rango cerrado: prueba ${next.toLocaleString("es-ES")} kg manteniendo el RIR.` }
  }
  if (reps < repMin || (rir !== null && rir < targetRir)) {
    return { loadKg, message: "Mantén o reduce ligeramente la carga hasta recuperar técnica y RIR." }
  }
  return { loadKg, message: `Mantén ${loadKg.toLocaleString("es-ES")} kg e intenta sumar una repetición limpia.` }
}

export function calculateTrainingStreak(dates: string[], today = new Date()) {
  const unique = new Set(dates.map((date) => date.slice(0, 10)))
  if (!unique.size) return 0
  const cursor = new Date(today)
  cursor.setHours(12, 0, 0, 0)
  const todayKey = cursor.toISOString().slice(0, 10)
  if (!unique.has(todayKey)) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (unique.has(cursor.toISOString().slice(0, 10))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function calculateAdherence(completed: number, planned: number) {
  if (planned <= 0) return 0
  return Math.min(100, Math.round((completed / planned) * 100))
}

export function calculateRirIntensity(rir: number | null) {
  if (rir === null) return 50
  return Math.max(20, Math.min(100, 100 - rir * 20))
}

export function calculateChange(latest: number | null, previous: number | null) {
  if (latest === null || previous === null) return null
  return Math.round((latest - previous) * 10) / 10
}
