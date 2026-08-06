import "server-only"

import { hasBetterAuthEnv } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { withRlsUser } from "@/lib/db"
import type { ProgressPhoto, ProgressPhotoView } from "@/types/progress-photo"

type ProgressPhotoRow = {
  id: string
  taken_on: string
  view: ProgressPhotoView
  storage_path: string
}

export async function getProgressPhotos(athleteId: string): Promise<ProgressPhoto[]> {
  if (!hasBetterAuthEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return []

  const result = await withRlsUser(athleteId, (db) => db.query<ProgressPhotoRow>(
    `select id::text, taken_on::text, view, storage_path
     from public.progress_photos
     where athlete_id=$1::uuid
     order by taken_on desc, case view when 'front' then 1 when 'side' then 2 else 3 end`,
    [athleteId],
  ))

  if (!result.rows.length) return []

  const storage = createAdminClient().storage.from("progress-photos")
  const { data, error } = await storage.createSignedUrls(result.rows.map((photo) => photo.storage_path), 60 * 60)
  if (error) throw new Error(`No se pudieron abrir las fotos de progreso: ${error.message}`)

  const urlsByPath = new Map(data.map((item) => [item.path, item.signedUrl]))
  return result.rows.flatMap((photo) => {
    const signedUrl = urlsByPath.get(photo.storage_path)
    return signedUrl ? [{
      id: photo.id,
      takenOn: photo.taken_on,
      view: photo.view,
      storagePath: photo.storage_path,
      signedUrl,
    }] : []
  })
}
