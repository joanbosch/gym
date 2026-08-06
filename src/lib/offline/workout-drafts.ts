"use client"

import { openDB } from "idb"
import type { SetDraft } from "@/types/domain"

function getDb() {
  return openDB("gym-joan", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("set-drafts")) db.createObjectStore("set-drafts", { keyPath: "id" })
      if (!db.objectStoreNames.contains("workout-state")) db.createObjectStore("workout-state", { keyPath: "workoutKey" })
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
}

export async function clearWorkoutStarted(workoutKey: string) {
  const db = await getDb()
  await db.delete("workout-state", workoutKey)
}

export async function loadDrafts(workoutKey: string) {
  const db = await getDb()
  const drafts = (await db.getAll("set-drafts")) as SetDraft[]
  return drafts.filter((draft) => draft.workoutKey === workoutKey)
}

export function deduplicateDrafts(drafts: SetDraft[]) {
  const draftsBySet = new Map<string, SetDraft>()

  for (const draft of drafts) {
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
}

export async function clearDrafts(workoutKey: string) {
  const db = await getDb()
  const transaction = db.transaction("set-drafts", "readwrite")
  const all = (await transaction.store.getAll()) as SetDraft[]
  await Promise.all(all.filter((draft) => draft.workoutKey === workoutKey).map((draft) => transaction.store.delete(draft.id)))
  await transaction.done
}
