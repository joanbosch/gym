"use client"

import { openDB } from "idb"
import type { LocalGuidedWorkout, SetDraft } from "@/types/domain"

export const guidedWorkoutChangeEvent = "guided-workout-change"

function notifyWorkoutChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(guidedWorkoutChangeEvent))
}

function getDb() {
  return openDB("gym-joan", 3, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("set-drafts")) db.createObjectStore("set-drafts", { keyPath: "id" })
      if (!db.objectStoreNames.contains("workout-state")) db.createObjectStore("workout-state", { keyPath: "workoutKey" })
      if (!db.objectStoreNames.contains("guided-workouts")) db.createObjectStore("guided-workouts", { keyPath: "sessionId" })
    },
  })
}

export async function hasWorkoutStarted(workoutKey: string) {
  const db = await getDb()
  const state = await db.get("workout-state", workoutKey) as { workoutKey: string; startedAt: string } | undefined
  if (state) return true

  const drafts = await loadDrafts(workoutKey)
  return drafts.some((draft) => draft.completed || draft.loadKg !== null || draft.reps !== null || draft.rir !== null)
}

export async function markWorkoutStarted(workoutKey: string) {
  const db = await getDb()
  await db.put("workout-state", { workoutKey, startedAt: new Date().toISOString() })
  notifyWorkoutChange()
}

export async function clearWorkoutStarted(workoutKey: string) {
  const db = await getDb()
  await db.delete("workout-state", workoutKey)
  notifyWorkoutChange()
}

export async function loadDrafts(workoutKey: string) {
  const db = await getDb()
  const drafts = (await db.getAll("set-drafts")) as SetDraft[]
  return drafts.filter((draft) => draft.workoutKey === workoutKey).map(normalizeDraft)
}

function normalizeDraft(draft: SetDraft): SetDraft {
  const status = draft.status ?? (draft.completed ? "completed" : "pending")
  return { ...draft, status, completed: status === "completed" }
}

export function deduplicateDrafts(drafts: SetDraft[]) {
  const draftsBySet = new Map<string, SetDraft>()

  for (const rawDraft of drafts) {
    const draft = normalizeDraft(rawDraft)
    const key = `${draft.exerciseId}:${draft.setNumber}`
    const current = draftsBySet.get(key)

    if (!current || current.clientChangedAt <= draft.clientChangedAt) {
      draftsBySet.set(key, draft)
    }
  }

  return Array.from(draftsBySet.values()).sort(
    (a, b) => a.exerciseId.localeCompare(b.exerciseId) || a.setNumber - b.setNumber,
  )
}

export async function storeDraft(draft: SetDraft) {
  const db = await getDb()
  await db.put("set-drafts", draft)
  notifyWorkoutChange()
}

export async function replaceDrafts(workoutKey: string, drafts: SetDraft[]) {
  const db = await getDb()
  const transaction = db.transaction("set-drafts", "readwrite")
  const all = (await transaction.store.getAll()) as SetDraft[]

  for (const draft of all) {
    if (draft.workoutKey === workoutKey) {
      await transaction.store.delete(draft.id)
    }
  }

  for (const draft of deduplicateDrafts(drafts)) {
    await transaction.store.put(draft)
  }

  await transaction.done
  notifyWorkoutChange()
}

export async function clearDrafts(workoutKey: string) {
  const db = await getDb()
  const transaction = db.transaction("set-drafts", "readwrite")
  const all = (await transaction.store.getAll()) as SetDraft[]
  await Promise.all(all.filter((draft) => draft.workoutKey === workoutKey).map((draft) => transaction.store.delete(draft.id)))
  await transaction.done
  notifyWorkoutChange()
}

export async function saveLocalGuidedWorkout(workout: LocalGuidedWorkout) {
  const db = await getDb()
  await db.put("guided-workouts", workout)
  notifyWorkoutChange()
}

export async function loadLocalGuidedWorkout(sessionId: string) {
  const db = await getDb()
  return (await db.get("guided-workouts", sessionId) as LocalGuidedWorkout | undefined) ?? null
}

export async function loadCurrentLocalGuidedWorkout() {
  const db = await getDb()
  const workouts = await db.getAll("guided-workouts") as LocalGuidedWorkout[]
  return workouts
    .filter((workout) => workout.syncState === "active" || workout.syncState === "completion_pending")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null
}

export async function removeLocalGuidedWorkout(sessionId: string) {
  const db = await getDb()
  await db.delete("guided-workouts", sessionId)
  notifyWorkoutChange()
}

export async function clearLocalGuidedWorkout(workout: LocalGuidedWorkout) {
  await Promise.all([
    clearDrafts(workout.workoutKey),
    clearWorkoutStarted(workout.workoutKey),
    removeLocalGuidedWorkout(workout.sessionId),
  ])
}
