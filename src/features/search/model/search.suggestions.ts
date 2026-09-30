import { foldText } from "@/features/links"
import type { VaultPath } from "@/shared/vault"
import type { SearchMetadata } from "./search.metadata"
import { queryParts } from "./search.query"

export interface FilterSuggestion {
  /** The part of the query being typed; choosing an option replaces exactly it. */
  start: number
  end: number
  options: { label: string; insert: string }[]
}

const maxOptions = 20

function partAt(text: string, cursor: number) {
  for (const match of queryParts(text)) {
    const start = match.index
    const end = start + match[0].length
    if (cursor < start || cursor > end) continue
    const [, quotedKey, quoted, plain] = match
    if (plain === undefined)
      return quotedKey
        ? { start, end, key: quotedKey.slice(0, -1), value: quoted }
        : null
    const colon = plain.indexOf(":")
    return colon > 0
      ? {
          start,
          end,
          key: plain.slice(0, colon),
          value: plain.slice(colon + 1),
        }
      : null
  }
  return null
}

/** Starts-with first, then contains; alphabetical inside each (RN-BUSCA-006). */
function ranked(values: string[], typed: string) {
  const wanted = foldText(typed)
  return values
    .map((value) => {
      const folded = foldText(value)
      const group = folded.startsWith(wanted)
        ? 0
        : folded.includes(wanted)
          ? 1
          : 2
      return { value, folded, group }
    })
    .filter((candidate) => candidate.group < 2)
    .sort((a, b) => a.group - b.group || a.folded.localeCompare(b.folded))
    .slice(0, maxOptions)
    .map((candidate) => candidate.value)
}

const quoteIfNeeded = (value: string) =>
  /[\s"]/.test(value) ? `"${value.replaceAll('"', "")}"` : value

/** Values that exist in the vault for the filter under the cursor; `null` outside a filter. */
export function suggestFilterValues(
  text: string,
  cursor: number,
  metadata: SearchMetadata,
  folders: VaultPath[]
): FilterSuggestion | null {
  const part = partAt(text, cursor)
  if (!part) return null
  const key = foldText(part.key)
  const make = (values: string[], label: (value: string) => string) => ({
    start: part.start,
    end: part.end,
    options: values.map((value) => ({
      label: label(value),
      insert: `${part.key}:${quoteIfNeeded(label(value))}`,
    })),
  })
  if (key === "tag")
    return make(
      ranked(metadata.tags, part.value.replace(/^#/, "")),
      (tag) => `#${tag}`
    )
  if (key === "pasta")
    return make(ranked(folders, part.value), (folder) => folder)
  const property = metadata.propertyKeys.find((name) => foldText(name) === key)
  if (!property) return null
  return make(
    ranked(metadata.propertyValues.get(property) ?? [], part.value),
    (value) => value
  )
}
