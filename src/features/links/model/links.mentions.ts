import {
  basenameOf,
  nameKey,
  type VaultEntry,
  type VaultPath,
} from "@/shared/vault"
import { codeRanges, parseLinks } from "./links.parser"

export interface Mention {
  /** Positions in the raw text (with BOM and original line breaks). */
  start: number
  end: number
  /** As written ("Deploy", "api"). */
  text: string
}

/** Shorter names would match articles and acronyms in almost every note (spec 003). */
const minNameLength = 3

/** Whether mentions of a note with this name are searched at all (FR-009). */
export function mentionsSearched(name: string): boolean {
  return [...name.normalize("NFC")].length >= minNameLength
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** RN-BACK-003: whole words (hyphen and underscore included), any case, same accents, outside code and links. */
export function findMentions(text: string, name: string): Mention[] {
  if (!mentionsSearched(name)) return []
  const wanted = name.normalize("NFC")
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_-])${escapeRegExp(wanted)}(?![\\p{L}\\p{N}_-])`,
    "giu"
  )
  const blocked = [
    ...codeRanges(text),
    ...parseLinks("", text).map((link) => link.range),
  ]
  const mentions: Mention[] = []
  for (const match of text.matchAll(pattern)) {
    const start = match.index
    const end = start + match[0].length
    if (blocked.some((range) => start < range.end && end > range.start))
      continue
    mentions.push({ start, end, text: match[0] })
  }
  return mentions
}

/** `[[text]]` when the name is unique; `[[folder/name|text]]` when repeated (RN-LINK-004). */
export function mentionLink({
  target,
  text,
  entries,
}: {
  target: VaultPath
  text: string
  entries: VaultEntry[]
}): string {
  const key = nameKey(basenameOf(target))
  const namesakes = entries.filter(
    (entry) => entry.kind === "note" && nameKey(entry.name) === key
  )
  return namesakes.length > 1
    ? `[[${target.replace(/\.md$/i, "")}|${text}]]`
    : `[[${text}]]`
}
