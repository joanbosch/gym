import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_WEBHOOK_SECRET) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  const rawBody = await request.text()
  const resend = new Resend(process.env.RESEND_API_KEY)
  let event
  try {
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    })
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }
  const eventId = request.headers.get("svix-id")!
  const eventData = event.data as unknown as { email_id?: string; to?: string[] }
  const admin = createAdminClient()
  const { error: duplicate } = await admin.from("email_events").insert({ id: eventId, provider_email_id: eventData.email_id, event_type: event.type, payload: event })
  if (duplicate?.code === "23505") return NextResponse.json({ ok: true, duplicate: true })
  if (duplicate) return NextResponse.json({ error: duplicate.message }, { status: 500 })

  const providerId = eventData.email_id
  if (providerId && event.type === "email.delivered") await admin.from("email_outbox").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("provider_email_id", providerId)
  if (providerId && ["email.bounced", "email.complained", "email.suppressed"].includes(event.type)) {
    await admin.from("email_outbox").update({ status: "suppressed", last_error: event.type }).eq("provider_email_id", providerId)
    const recipients = Array.isArray(eventData.to) ? eventData.to : []
    const reason = event.type === "email.complained" ? "complaint" : "hard_bounce"
    for (const email of recipients) await admin.from("email_suppressions").upsert({ email: String(email).toLowerCase(), reason, source_email_id: providerId })
  }
  return NextResponse.json({ ok: true })
}
