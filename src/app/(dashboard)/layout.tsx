import { AppShell } from "@/components/app/app-shell"
import { loadActiveWorkoutSession } from "@/actions/workout"
import { getCurrentProfile } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, activeWorkout] = await Promise.all([getCurrentProfile(), loadActiveWorkoutSession()])
  return <AppShell profile={profile} activeWorkout={activeWorkout}>{children}</AppShell>
}
