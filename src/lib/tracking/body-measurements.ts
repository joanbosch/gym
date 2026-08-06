import "server-only"

import { hasBetterAuthEnv } from "@/lib/auth"
import { withRlsUser } from "@/lib/db"
import type { BiologicalSex } from "@/lib/body-composition"

export type BodyMeasurementRecord = {
  measuredOn: string
  sex: BiologicalSex | null
  weight: number | null
  height: number | null
  waist: number | null
  neck: number | null
  hip: number | null
  chest: number | null
  arm: number | null
  thigh: number | null
}

type BodyMeasurementRow = {
  measured_on: string
  biological_sex: BiologicalSex | null
  weight: string | null
  height: string | null
  waist: string | null
  neck: string | null
  hip: string | null
  chest: string | null
  arm: string | null
  thigh: string | null
}

const numberOrNull = (value: string | null) => value === null ? null : Number(value)

export async function loadBodyMeasurements(athleteId: string): Promise<BodyMeasurementRecord[]> {
  if (!hasBetterAuthEnv()) return []
  const result = await withRlsUser(athleteId, (db) => db.query<BodyMeasurementRow>(
    `select coalesce(w.measured_on,b.measured_on)::text measured_on,b.biological_sex,
            w.weight_kg::text weight,b.height_cm::text height,b.waist_cm::text waist,b.neck_cm::text neck,
            b.hip_cm::text hip,b.chest_cm::text chest,b.arm_cm::text arm,b.thigh_cm::text thigh
     from public.weigh_ins w
     full join public.body_measurements b on b.athlete_id=w.athlete_id and b.measured_on=w.measured_on
     where coalesce(w.athlete_id,b.athlete_id)=$1::uuid
     order by coalesce(w.measured_on,b.measured_on) desc`,
    [athleteId],
  ))
  return result.rows.map((row) => ({
    measuredOn: row.measured_on,
    sex: row.biological_sex,
    weight: numberOrNull(row.weight),
    height: numberOrNull(row.height),
    waist: numberOrNull(row.waist),
    neck: numberOrNull(row.neck),
    hip: numberOrNull(row.hip),
    chest: numberOrNull(row.chest),
    arm: numberOrNull(row.arm),
    thigh: numberOrNull(row.thigh),
  }))
}
