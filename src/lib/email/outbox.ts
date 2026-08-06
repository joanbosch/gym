import { createElement } from "react"
import { render } from "react-email"
import { Resend } from "resend"
import { systemQuery } from "@/lib/db"
import { getEmailTemplate, NotificationEmail } from "@/lib/email/template"
import { getEmailConfig } from "@/lib/env"

type EmailTemplate = "account_activation" | "password_reset" | "email_verification"

type OutboxRow = {
  id: string
  to_email: string
  template: string
  subject: string
  payload: Record<string, unknown>
  idempotency_key: string
  attempts: number
}

export async function enqueueAuthEmail(input: {
  email: string
  name?: string | null
  template: EmailTemplate
  subject: string
  actionUrl: string
  idempotencyKey: string
}) {
  const result = await systemQuery<{ id: string }>(
    `insert into public.email_outbox
       (recipient_user_id, to_email, template, subject, payload, idempotency_key)
     values (
       (select id from public.profiles where lower(email) = lower($1) limit 1),
       lower($1), $2, $3,
       jsonb_build_object('name', $4::text, 'actionUrl', $5::text),
       $6
     )
     on conflict (idempotency_key) do update set idempotency_key = excluded.idempotency_key
     returning id::text`,
    [input.email, input.template, input.subject, input.name ?? "", input.actionUrl, input.idempotencyKey],
  )

  const id = result.rows[0]?.id
  if (id) await processEmailOutbox({ ids: [id] })
  return id
}

export async function processEmailOutbox(options: { ids?: string[]; limit?: number } = {}) {
  const config = getEmailConfig()
  if (config.mode !== "resend" || !process.env.RESEND_API_KEY) {
    return { processed: 0, failed: 0, skipped: true }
  }

  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)
  const values: unknown[] = [limit]
  let idFilter = ""
  if (options.ids?.length) {
    values.push(options.ids)
    idFilter = `and o.id = any($2::uuid[])`
  }

  const pending = await systemQuery<OutboxRow>(
    `select o.id::text, o.to_email, o.template, o.subject, o.payload,
            o.idempotency_key, o.attempts
     from public.email_outbox o
     where o.status in ('pending', 'failed')
       and o.next_attempt_at <= now()
       and o.attempts < 5
       ${idFilter}
     order by o.created_at
     limit $1`,
    values,
  )

  const resend = new Resend(process.env.RESEND_API_KEY)
  let processed = 0
  let failed = 0

  for (const email of pending.rows) {
    const suppression = await systemQuery(
      "select 1 from public.email_suppressions where lower(email) = lower($1) limit 1",
      [email.to_email],
    )
    if (suppression.rowCount) {
      await systemQuery(
        "update public.email_outbox set status = 'suppressed', last_error = 'Dirección suprimida' where id = $1::uuid",
        [email.id],
      )
      continue
    }

    const claimed = await systemQuery<{ attempts: number }>(
      `update public.email_outbox
       set status = 'processing', attempts = attempts + 1
       where id = $1::uuid and status in ('pending', 'failed')
       returning attempts`,
      [email.id],
    )
    if (!claimed.rowCount) continue

    try {
      const props = getEmailTemplate(email.template, email.payload)
      const component = createElement(NotificationEmail, props)
      const [html, text] = await Promise.all([
        render(component),
        render(component, { plainText: true }),
      ])
      const result = await resend.emails.send(
        {
          from: config.from,
          to: [email.to_email],
          subject: email.subject,
          html,
          text,
          replyTo: config.replyTo,
          tags: [{ name: "template", value: email.template.replace(/[^a-zA-Z0-9_-]/g, "_") }],
        },
        { idempotencyKey: email.idempotency_key },
      )

      if (result.error) throw result.error
      await systemQuery(
        `update public.email_outbox
         set status = 'sent', provider_email_id = $2, sent_at = now(), last_error = null
         where id = $1::uuid`,
        [email.id, result.data?.id ?? null],
      )
      processed++
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error
        ? Number(error.statusCode)
        : 0
      const retryable = statusCode === 0 || statusCode === 429 || statusCode >= 500
      const attempts = claimed.rows[0]?.attempts ?? email.attempts + 1
      const nextAttempts = retryable ? attempts : 5
      const delayMinutes = Math.min(2 ** attempts, 60)
      await systemQuery(
        `update public.email_outbox
         set status = 'failed', attempts = $2, last_error = $3,
             next_attempt_at = now() + ($4::text || ' minutes')::interval
         where id = $1::uuid`,
        [email.id, nextAttempts, error instanceof Error ? error.message : "Error de entrega", delayMinutes],
      )
      failed++
    }
  }

  return { processed, failed, skipped: false }
}
