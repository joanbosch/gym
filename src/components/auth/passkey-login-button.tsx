"use client"

import { useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FingerprintIcon } from "lucide-react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export function PasskeyLoginButton() {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (typeof PublicKeyCredential === "undefined" || !PublicKeyCredential.isConditionalMediationAvailable) return
    let active = true
    void PublicKeyCredential.isConditionalMediationAvailable().then((available) => {
      if (!active || !available) return
      void authClient.signIn.passkey({
        autoFill: true,
        fetchOptions: { onSuccess: () => { router.push("/hoy"); router.refresh() } },
      })
    })
    return () => { active = false }
  }, [router])

  const signIn = () => startTransition(async () => {
    const result = await authClient.signIn.passkey({
      fetchOptions: {
        onSuccess: () => { router.push("/hoy"); router.refresh() },
      },
    })
    if (result?.error) toast.error(result.error.message ?? "No se ha podido usar la Passkey")
  })

  return <Button type="button" variant="outline" size="lg" disabled={pending} onClick={signIn}><FingerprintIcon data-icon="inline-start" />Entrar con Passkey</Button>
}
