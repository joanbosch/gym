import { loadActiveWorkoutSession } from "@/actions/workout"
import { GuidedWorkoutRunner } from "@/components/workout/guided-workout-runner"

export const metadata = { title: "Entrenamiento activo" }

export default async function ActiveWorkoutPage() {
  const active = await loadActiveWorkoutSession()
  return <GuidedWorkoutRunner initialRemote={active} />
}
