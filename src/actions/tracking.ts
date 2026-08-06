"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthSession, hasBetterAuthEnv } from "@/lib/auth"
import { calculateBodyComposition } from "@/lib/body-composition"
import { withRlsUser } from "@/lib/db"

export type ActionState = { ok: boolean; message: string }

const nutritionSchema = z.object({
  logDate: z.iso.date(),
  calories: z.coerce.number().int().min(0).max(10000),
  proteinG: z.coerce.number().min(0).max(1000),
  carbsG: z.coerce.number().min(0).max(2000),
  fatG: z.coerce.number().min(0).max(1000),
  waterMl: z.coerce.number().int().min(0).max(20000),
})

const optionalNumber = (minimum: number, maximum: number) => z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().min(minimum).max(maximum).optional(),
)

const bodyMetricsSchema = z.object({
  measuredOn: z.iso.date(),
  sex: z.enum(["male", "female"]),
  weight: z.coerce.number().min(20).max(400),
  height: z.coerce.number().min(100).max(250),
  waist: z.coerce.number().min(30).max(250),
  neck: z.coerce.number().min(20).max(80),
  hip: optionalNumber(40, 250),
  chest: optionalNumber(30, 250),
  arm: optionalNumber(10, 100),
  thigh: optionalNumber(20, 150),
}).refine((data) => data.sex === "male" || data.hip !== undefined, { message: "La fórmula para mujeres necesita la medida de cadera", path: ["hip"] })

export async function saveNutrition(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = nutritionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }
  if (!hasBetterAuthEnv()) return { ok: true, message: "Registro guardado en modo demostración" }
  const session = await getAuthSession()
  if (!session) return { ok: false, message: "Sesión no válida" }
  try {
    await withRlsUser(session.user.id, (db) => db.query(
      `insert into public.nutrition_daily_logs(athlete_id,log_date,calories,protein_g,carbs_g,fat_g,water_ml)
       values($1::uuid,$2::date,$3,$4,$5,$6,$7)
       on conflict(athlete_id,log_date) do update set calories=excluded.calories,protein_g=excluded.protein_g,carbs_g=excluded.carbs_g,fat_g=excluded.fat_g,water_ml=excluded.water_ml,updated_at=now()`,
      [session.user.id, parsed.data.logDate, parsed.data.calories, parsed.data.proteinG, parsed.data.carbsG, parsed.data.fatG, parsed.data.waterMl],
    ))
    return { ok: true, message: "Nutrición guardada" }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo guardar" }
  }
}

export async function saveBodyMetrics(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = bodyMetricsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }
  if (!hasBetterAuthEnv()) return { ok: true, message: "Medidas guardadas en modo demostración" }
  const session = await getAuthSession()
  if (!session) return { ok: false, message: "Sesión no válida" }
  const data = parsed.data
  const estimate = calculateBodyComposition({
    sex: data.sex,
    weightKg: data.weight,
    heightCm: data.height,
    waistCm: data.waist,
    neckCm: data.neck,
    hipCm: data.hip,
  })
  if (!estimate) return { ok: false, message: "No se pudo calcular la composición: revisa los perímetros introducidos" }
  try {
    await withRlsUser(session.user.id, async (db) => {
      await db.query(
        `insert into public.weigh_ins(athlete_id,measured_on,weight_kg) values($1::uuid,$2::date,$3)
         on conflict(athlete_id,measured_on) do update set weight_kg=excluded.weight_kg`,
        [session.user.id, data.measuredOn, data.weight],
      )
      await db.query(
        `insert into public.body_measurements(
           athlete_id,measured_on,body_fat_percentage,body_fat_method,biological_sex,height_cm,waist_cm,neck_cm,hip_cm,chest_cm,arm_cm,thigh_cm
         ) values($1::uuid,$2::date,$3,'hodgdon_beckett',$4,$5,$6,$7,$8,$9,$10,$11)
         on conflict(athlete_id,measured_on) do update set
           body_fat_percentage=excluded.body_fat_percentage,
           body_fat_method=excluded.body_fat_method,
           biological_sex=excluded.biological_sex,
           height_cm=excluded.height_cm,
           waist_cm=excluded.waist_cm,
           neck_cm=excluded.neck_cm,
           hip_cm=excluded.hip_cm,
           chest_cm=coalesce(excluded.chest_cm,public.body_measurements.chest_cm),
           arm_cm=coalesce(excluded.arm_cm,public.body_measurements.arm_cm),
           thigh_cm=coalesce(excluded.thigh_cm,public.body_measurements.thigh_cm)`,
        [session.user.id, data.measuredOn, estimate.bodyFatPercentage, data.sex, data.height, data.waist, data.neck, data.hip ?? null, data.chest ?? null, data.arm ?? null, data.thigh ?? null],
      )
    })
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudieron guardar las medidas" }
  }
  revalidatePath("/rendimiento")
  revalidatePath("/medidas")
  revalidatePath("/progreso")
  revalidatePath("/hoy")
  return { ok: true, message: `Medidas guardadas · Grasa estimada ${estimate.bodyFatPercentage.toLocaleString("es-ES")}% · IMC ${estimate.bmi.toLocaleString("es-ES")}` }
}
