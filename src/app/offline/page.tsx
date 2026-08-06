import Link from "next/link"
import { CloudOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = { title: "Sin conexión" }

export default function OfflinePage() {
  return <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4"><Card className="max-w-md"><CardHeader><CloudOffIcon aria-hidden="true" /><CardTitle>Ahora mismo no hay conexión</CardTitle><CardDescription>La sesión que ya habías abierto sigue guardándose en este dispositivo.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Vuelve a la sesión desde el historial del navegador. La administración, las fotos y las analíticas necesitan conexión.</p></CardContent><CardFooter><Button asChild className="w-full"><Link href="/entrenamiento">Intentar volver a la sesión</Link></Button></CardFooter></Card></main>
}
