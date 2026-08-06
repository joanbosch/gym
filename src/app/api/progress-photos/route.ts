import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthSession, hasBetterAuthEnv } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { withRlsUser } from "@/lib/db"
import { progressPhotoViews } from "@/types/progress-photo"

export const runtime = "nodejs"

const bucketName = "progress-photos"
const maxFileSize = 10 * 1024 * 1024
const mimeExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/webp": "webp",
} as const

const viewSchema = z.enum(progressPhotoViews)
const prepareSchema = z.object({
  action: z.literal("prepare"),
  takenOn: z.iso.date(),
  files: z.array(z.object({
    view: viewSchema,
    mimeType: z.enum(Object.keys(mimeExtensions) as [keyof typeof mimeExtensions, ...(keyof typeof mimeExtensions)[]]),
    size: z.number().int().positive().max(maxFileSize),
  })).min(1).max(3),
}).refine(({ files }) => new Set(files.map((file) => file.view)).size === files.length, {
  message: "No puedes subir dos fotos de la misma vista",
})

const completeSchema = z.object({
  action: z.literal("complete"),
  takenOn: z.iso.date(),
  uploads: z.array(z.object({ view: viewSchema, path: z.string().min(1).max(500) })).min(1).max(3),
}).refine(({ uploads }) => new Set(uploads.map((upload) => upload.view)).size === uploads.length, {
  message: "No puedes guardar dos fotos de la misma vista",
})

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status })
}

export async function POST(request: Request) {
  if (!hasBetterAuthEnv()) return jsonError("La subida de fotos no está disponible en modo demostración", 503)
  const session = await getAuthSession()
  if (!session) return jsonError("Sesión no válida", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("Solicitud no válida", 400)
  }

  if (typeof body !== "object" || body === null || !("action" in body)) return jsonError("Solicitud no válida", 400)
  const storage = createAdminClient().storage.from(bucketName)

  if (body.action === "prepare") {
    const parsed = prepareSchema.safeParse(body)
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Datos no válidos", 400)

    let uploads
    try {
      uploads = await Promise.all(parsed.data.files.map(async (file) => {
        const extension = mimeExtensions[file.mimeType]
        const path = `${session.user.id}/${parsed.data.takenOn}/${file.view}/${randomUUID()}.${extension}`
        const { data, error } = await storage.createSignedUploadUrl(path)
        if (error) throw new Error(error.message)
        return { view: file.view, path, token: data.token }
      }))
    } catch {
      return jsonError("No se pudo preparar la subida de las fotos", 500)
    }

    return NextResponse.json({ ok: true, uploads })
  }

  if (body.action === "complete") {
    const parsed = completeSchema.safeParse(body)
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Datos no válidos", 400)

    const expectedPrefix = `${session.user.id}/${parsed.data.takenOn}/`
    const ownsEveryPath = parsed.data.uploads.every(({ view, path }) =>
      path.startsWith(`${expectedPrefix}${view}/`) && /^[0-9a-f-]+\.(?:jpg|png|heic|webp)$/.test(path.split("/").at(-1) ?? ""),
    )
    if (!ownsEveryPath) return jsonError("La ruta de una foto no es válida", 403)

    const existenceChecks = await Promise.all(parsed.data.uploads.map(({ path }) => storage.exists(path)))
    const missingPhoto = existenceChecks.find(({ data, error }) => !data || error)
    if (missingPhoto) return jsonError("Una de las fotos no terminó de subirse", 400)

    const newPaths = parsed.data.uploads.map((upload) => upload.path)
    let replacedPaths: string[] = []
    try {
      replacedPaths = await withRlsUser(session.user.id, async (db) => {
        const existing = await db.query<{ storage_path: string }>(
          `select storage_path from public.progress_photos
           where athlete_id=$1::uuid and taken_on=$2::date and view=any($3::text[])`,
          [session.user.id, parsed.data.takenOn, parsed.data.uploads.map((upload) => upload.view)],
        )
        for (const upload of parsed.data.uploads) {
          await db.query(
            `insert into public.progress_photos(athlete_id,taken_on,view,storage_path)
             values($1::uuid,$2::date,$3,$4)
             on conflict(athlete_id,taken_on,view) do update set storage_path=excluded.storage_path, created_at=now()`,
            [session.user.id, parsed.data.takenOn, upload.view, upload.path],
          )
        }
        return existing.rows.map((photo) => photo.storage_path).filter((path) => !newPaths.includes(path))
      })
    } catch {
      await storage.remove(newPaths)
      return jsonError("No se pudieron guardar las fotos", 500)
    }

    if (replacedPaths.length) await storage.remove(replacedPaths)
    revalidatePath("/progreso")
    return NextResponse.json({ ok: true, saved: parsed.data.uploads.length })
  }

  return jsonError("Acción no válida", 400)
}
