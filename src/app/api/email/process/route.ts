import { NextResponse } from "next/server"
import { processEmailOutbox } from "@/lib/email/outbox"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!process.env.EMAIL_PROCESSOR_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.EMAIL_PROCESSOR_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    return NextResponse.json(await processEmailOutbox())
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar la cola"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
