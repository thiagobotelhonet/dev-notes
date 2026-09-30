import {
  nameKey,
  parentOf,
  type VaultEntry,
  type VaultPath,
} from "@/shared/vault"
import { foldText } from "./links.text"

/** A note offered by the autocomplete (data-model "LinkSuggestion"). */
export interface LinkSuggestion {
  path: VaultPath
  name: string
  /** "" for the vault root. */
  folder: VaultPath
  /** Only the name when it is unique, else `folder/name` (RN-LINK-004, 005). */
  insert: string
  /** 1 = name starts with the text; 2 = name contains it; 3 = only the folder does. */
  group: 1 | 2 | 3
  modifiedAt: number
}

const maxSuggestions = 50

function groupOf(entry: VaultEntry, query: string) {
  const name = foldText(entry.name)
  if (name.startsWith(query)) return 1
  if (name.includes(query)) return 2
  if (foldText(parentOf(entry.path)).includes(query)) return 3
  return null
}

/** FR-013: by group, then the most recently edited first. */
export function suggestLinks(
  query: string,
  notes: VaultEntry[]
): LinkSuggestion[] {
  const wanted = foldText(query)
  const onlyNotes = notes.filter((entry) => entry.kind === "note")
  const namesakes = new Map<string, number>()
  for (const note of onlyNotes) {
    const key = nameKey(note.name)
    namesakes.set(key, (namesakes.get(key) ?? 0) + 1)
  }
  const suggestions: LinkSuggestion[] = []
  for (const note of onlyNotes) {
    const group = groupOf(note, wanted)
    if (group === null) continue
    const repeated = (namesakes.get(nameKey(note.name)) ?? 0) > 1
    suggestions.push({
      path: note.path,
      name: note.name,
      folder: parentOf(note.path),
      insert: repeated ? note.path.replace(/\.md$/i, "") : note.name,
      group,
      modifiedAt: note.modifiedAt,
    })
  }
  return suggestions
    .sort(
      (a, b) =>
        a.group - b.group ||
        b.modifiedAt - a.modifiedAt ||
        a.path.localeCompare(b.path)
    )
    .slice(0, maxSuggestions)
}
