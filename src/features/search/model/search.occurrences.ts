import { foldTextUntrimmed } from "@/features/links"
import { type Snippet, snippetOf } from "@/shared/lib/snippet"
import type { SearchQuery } from "./search.query"

export interface SearchOccurrence {
  /** Positions in the file, as the link index and the editor's `open` expect. */
  start: number
  end: number
  snippet: Snippet
}

const wordChar = String.raw`[\p{L}\p{N}]`
const separator = String.raw`[^\p{L}\p{N}]+`

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Folding changes lengths (accents), so each folded position remembers where it came from. */
function foldWithOrigins(raw: string) {
  let text = ""
  const origins: number[] = []
  let position = 0
  for (const char of raw) {
    const folded = foldTextUntrimmed(char)
    for (let i = 0; i < folded.length; i++) origins.push(position)
    text += folded
    position += char.length
  }
  origins.push(raw.length)
  return { text, origins }
}

/** Words match a word start and highlight the whole word; phrases are exact sequences. */
function patternsOf(query: Pick<SearchQuery, "words" | "phrases">) {
  return [
    ...query.words.map(
      (word) => `(?<!${wordChar})${escapeRegExp(word)}${wordChar}*`
    ),
    ...query.phrases.map(
      (terms) =>
        `(?<!${wordChar})${terms.map(escapeRegExp).join(separator)}(?!${wordChar})`
    ),
  ]
}

/** `folded` must come from `foldTextUntrimmed`; the index keeps one per note (research R8). */
export function matchesFolded(
  folded: string,
  query: Pick<SearchQuery, "words" | "phrases">
): boolean {
  return patternsOf(query).every((pattern) =>
    new RegExp(pattern, "u").test(folded)
  )
}

/** Every occurrence of the words and phrases, counted; only the first `limit` get positions and snippets. */
export function findOccurrences(
  raw: string,
  query: Pick<SearchQuery, "words" | "phrases">,
  limit = 3
): { count: number; occurrences: SearchOccurrence[] } {
  const { text, origins } = foldWithOrigins(raw)
  const byStart = new Map<number, number>()
  for (const pattern of patternsOf(query))
    for (const match of text.matchAll(new RegExp(pattern, "gu"))) {
      const end = match.index + match[0].length
      byStart.set(match.index, Math.max(byStart.get(match.index) ?? 0, end))
    }
  const sorted = [...byStart].sort(([a], [b]) => a - b)
  return {
    count: sorted.length,
    occurrences: sorted.slice(0, limit).map(([start, end]) => {
      const rawStart = origins[start]
      const rawEnd = origins[end]
      return {
        start: rawStart,
        end: rawEnd,
        snippet: snippetOf(raw, rawStart, rawEnd),
      }
    }),
  }
}
