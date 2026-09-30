import {
  findMentions,
  type LinkIndex,
  mentionsSearched,
} from "@/features/links"
import { type Snippet, snippetOf } from "@/shared/lib/snippet"
import { basenameOf, parentOf, type VaultPath } from "@/shared/vault"

export interface Occurrence {
  start: number
  end: number
  embed: boolean
  snippet: Snippet
}

export interface NoteGroup {
  source: VaultPath
  name: string
  folder: VaultPath
  occurrences: Occurrence[]
}

function group(
  source: VaultPath,
  occurrences: Omit<Occurrence, "snippet">[],
  text: string
): NoteGroup {
  return {
    source,
    name: basenameOf(source),
    folder: parentOf(source),
    occurrences: occurrences
      .map((occurrence) => ({
        ...occurrence,
        snippet: snippetOf(text, occurrence.start, occurrence.end),
      }))
      .sort((a, b) => a.start - b.start),
  }
}

/** RN-BACK-001: notes whose links resolve to `path` (never itself), by path. */
export function backlinkGroups(index: LinkIndex, path: VaultPath): NoteGroup[] {
  const bySource = new Map<VaultPath, Omit<Occurrence, "snippet">[]>()
  for (const link of index.linksTo(path)) {
    if (link.source === path) continue
    const list = bySource.get(link.source) ?? []
    list.push({
      start: link.range.start,
      end: link.range.end,
      embed: link.embed,
    })
    bySource.set(link.source, list)
  }
  return [...bySource]
    .map(([source, occurrences]) =>
      group(source, occurrences, index.textOf(source) ?? "")
    )
    .sort((a, b) => a.source.localeCompare(b.source))
}

/** RN-BACK-002/003: other notes citing the name as whole words; short names are not searched. */
export function mentionGroups(
  index: LinkIndex,
  path: VaultPath
): { shortName: boolean; groups: NoteGroup[] } {
  const name = basenameOf(path)
  if (!mentionsSearched(name)) return { shortName: true, groups: [] }
  const groups: NoteGroup[] = []
  for (const source of index.notePaths()) {
    if (source === path) continue
    const text = index.textOf(source) ?? ""
    const found = findMentions(text, name)
    if (found.length)
      groups.push(
        group(
          source,
          found.map((mention) => ({ ...mention, embed: false })),
          text
        )
      )
  }
  return {
    shortName: false,
    groups: groups.sort((a, b) => a.source.localeCompare(b.source)),
  }
}
