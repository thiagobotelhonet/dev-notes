import {
  findMentions,
  type LinkIndex,
  mentionsSearched,
} from "@/features/links"
import { basenameOf, parentOf, type VaultPath } from "@/shared/vault"

/** The occurrence line split around the occurrence (data-model "Trecho"). */
export interface Snippet {
  before: string
  match: string
  after: string
}

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

const maxSnippetLength = 120

export function snippetOf(text: string, start: number, end: number): Snippet {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1
  const newline = text.indexOf("\n", end)
  const lineEnd = newline === -1 ? text.length : newline
  let before = text.slice(lineStart, start).replace(/^﻿/, "").trimStart()
  const match = text.slice(start, end)
  let after = text.slice(end, lineEnd).replace(/\r$/, "").trimEnd()
  const room = maxSnippetLength - match.length
  if (before.length + after.length > room) {
    const half = Math.max(0, Math.floor(room / 2))
    if (before.length > half) before = `…${before.slice(-half)}`
    if (after.length > half) after = `${after.slice(0, half)}…`
  }
  return { before, match, after }
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
