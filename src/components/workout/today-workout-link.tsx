"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { hasWorkoutStarted } from "@/lib/offline/workout-drafts"

export function TodayWorkoutLink({ workoutId }: { workoutId: string }) {
  const [canResume, setCanResume] = useState(false)

  useEffect(() => {
    let cancelled = false
    void hasWorkoutStarted(workoutId).then((value) => {
      if (!cancelled) setCanResume(value)
    })
    return () => { cancelled = true }
  }, [workoutId])

  return (
    <Button asChild size="lg">
      <Link href={`/entrenamiento?sesion=${workoutId}`}>{canResume ? "Reanudar sesión" : "Empezar sesión"} <ArrowRightIcon data-icon="inline-end" /></Link>
    </Button>
  )
}
