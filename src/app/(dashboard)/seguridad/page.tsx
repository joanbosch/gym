import { PageHeading } from "@/components/dashboard/page-heading"
import { PasskeyManager } from "@/components/auth/passkey-manager"

export const metadata = { title: "Seguridad" }

export default function SecurityPage() {
  return <><PageHeading title="Seguridad" description="Gestiona tus métodos de acceso sin compartir contraseñas." /><PasskeyManager /></>
}
