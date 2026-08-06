const appUrl = Deno.env.get("APP_URL") ?? "https://gym.joanbosch.dev"
const secret = Deno.env.get("EMAIL_PROCESSOR_SECRET")

Deno.serve(async () => {
  if (!secret) return new Response("Missing EMAIL_PROCESSOR_SECRET", { status: 500 })
  const response = await fetch(`${appUrl}/api/email/process`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
  })
  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json" },
  })
})
