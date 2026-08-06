"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { FingerprintIcon, KeyRoundIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

type PasskeyItem = { id: string; name?: string | null }
type PasskeyList = PasskeyItem[]

export function PasskeyManager() {
  const [items, setItems] = useState<PasskeyList>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    const result = await authClient.passkey.listUserPasskeys()
    if (result.error) toast.error(result.error.message)
    setItems((result.data ?? []) as PasskeyList)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    void authClient.passkey.listUserPasskeys().then((result) => {
      if (!active) return
      if (result.error) toast.error(result.error.message)
      setItems((result.data ?? []) as PasskeyList)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const add = (formData: FormData) => startTransition(async () => {
    const result = await authClient.passkey.addPasskey({
      name: String(formData.get("name") || "Passkey principal"),
    })
    if (result?.error) toast.error(result.error.message ?? "No se ha podido registrar la Passkey")
    else { toast.success("Passkey registrada"); await load() }
  })

  const remove = (id: string) => startTransition(async () => {
    const result = await authClient.passkey.deletePasskey({ id })
    if (result.error) toast.error(result.error.message)
    else { toast.success("Passkey eliminada"); await load() }
  })

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]"><Card><CardHeader><CardTitle>Tus Passkeys</CardTitle><CardDescription>Accede con Face ID, Touch ID, Windows Hello, el PIN del dispositivo o una llave física.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{loading ? <><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></> : items.length ? items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3"><div className="flex size-10 items-center justify-center rounded-lg bg-muted"><KeyRoundIcon aria-hidden="true" /></div><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.name || "Passkey"}</p><p className="text-sm text-muted-foreground">Credencial protegida por tu dispositivo</p></div><Button type="button" variant="ghost" size="icon-sm" aria-label={`Eliminar ${item.name || "Passkey"}`} disabled={pending} onClick={() => remove(item.id)}><Trash2Icon aria-hidden="true" /></Button></div>) : <Empty><EmptyHeader><EmptyMedia variant="icon"><FingerprintIcon aria-hidden="true" /></EmptyMedia><EmptyTitle>Aún no tienes Passkeys</EmptyTitle><EmptyDescription>Añade una después de iniciar sesión. La contraseña seguirá disponible como recuperación.</EmptyDescription></EmptyHeader></Empty>}</CardContent></Card><Card><CardHeader><CardTitle>Añadir Passkey</CardTitle><CardDescription>El registro se vincula al dominio actual y no puede reutilizarse desde una web falsa.</CardDescription></CardHeader><CardContent><form action={add}><FieldGroup><Field><FieldLabel htmlFor="passkey-name">Nombre del dispositivo</FieldLabel><Input id="passkey-name" name="name" placeholder="MacBook de Joan" maxLength={80} /></Field><Button type="submit" disabled={pending}><FingerprintIcon data-icon="inline-start" />Registrar Passkey</Button></FieldGroup></form></CardContent></Card></div>
}
