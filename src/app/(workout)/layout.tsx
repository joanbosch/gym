import { getCurrentProfile } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function WorkoutModeLayout({ children }: { children: React.ReactNode }) {
  await getCurrentProfile()
  return children
}
