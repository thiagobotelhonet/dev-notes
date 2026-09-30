import { nameKey, type VaultEntry, type VaultPath } from "@/shared/vault"
import { deletedNotesSchema } from "../types/links.schemas"

/** Notes deleted while the app was open, oldest first (data-model "DeletedNotesRegistry"). */
export type DeletedNotes = readonly { path: VaultPath; deletedAt: string }[]

const maxEntries = 5000

/** Missing, invalid or unknown-version data is an empty registry, never an error (ADR-009). */
export function parseDeletedNotes(json: string | null): DeletedNotes {
  if (json === null) return []
  try {
    const parsed = deletedNotesSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data.notes : []
  } catch {
    return []
  }
}

export function serializeDeletedNotes(notes: DeletedNotes): string {
  return JSON.stringify({ version: 1, notes }, null, 2)
}

export function withDeleted(
  notes: DeletedNotes,
  paths: VaultPath[],
  at: Date
): DeletedNotes {
  const keys = new Set(paths.map(nameKey))
  const deletedAt = at.toISOString()
  return [
    ...notes.filter((note) => !keys.has(nameKey(note.path))),
    ...paths.map((path) => ({ path, deletedAt })),
  ].slice(-maxEntries)
}

/** Drops every path that exists again; the same array when nothing changed. */
export function withoutExisting(
  notes: DeletedNotes,
  entries: VaultEntry[]
): DeletedNotes {
  const existing = new Set(
    entries
      .filter((entry) => entry.kind === "note")
      .map((entry) => nameKey(entry.path))
  )
  const kept = notes.filter((note) => !existing.has(nameKey(note.path)))
  return kept.length === notes.length ? notes : kept
}
