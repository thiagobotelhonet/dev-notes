import { foldText } from "@/features/links"

export interface PropertyFilter {
  key: string
  value: string
}

/** What the user typed, split and folded (data-model "Consulta"). */
export interface SearchQuery {
  /** Single terms; each matches the start of a word. */
  words: string[]
  /** Terms that must appear in sequence: quoted text, or a word with separators. */
  phrases: string[][]
  tags: string[]
  folders: string[]
  properties: PropertyFilter[]
}

/** A quoted part may carry a filter key (`pasta:"minhas notas"`); an unclosed quote runs to the end. */
const partPattern = /([^\s"]+:)?"([^"]*)(?:"|$)|(\S+)/g

/** The parts of a query, with positions; the suggestions split the same way. */
export const queryParts = (text: string) => text.matchAll(partPattern)

/** The same split the index uses: anything but letters and numbers separates terms. */
function termsOf(text: string): string[] {
  return foldText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

function addText(query: SearchQuery, text: string, quoted: boolean) {
  const terms = termsOf(text)
  if (terms.length === 0) return
  if (terms.length === 1 && !quoted) query.words.push(terms[0])
  else query.phrases.push(terms)
}

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "")

/** A filter when the key is `tag`, `pasta` or a known property; `false` makes it text (FR-018). */
function addFilter(
  query: SearchQuery,
  key: string,
  value: string,
  propertyKeys: Set<string>
): boolean {
  const name = foldText(key)
  const folded = foldText(value)
  if (name === "tag") {
    const tag = trimSlashes(folded.replace(/^#/, ""))
    if (tag) query.tags.push(tag)
  } else if (name === "pasta") {
    const folder = trimSlashes(folded)
    if (folder) query.folders.push(folder)
  } else if (propertyKeys.has(name)) {
    if (folded) query.properties.push({ key: name, value: folded })
  } else return false
  return true
}

/** Research R6: words, quoted phrases and `chave:valor` filters, all folded. */
export function parseQuery(
  text: string,
  propertyKeys: readonly string[] = []
): SearchQuery {
  const query: SearchQuery = {
    words: [],
    phrases: [],
    tags: [],
    folders: [],
    properties: [],
  }
  const keys = new Set(propertyKeys.map(foldText))
  for (const [, quotedKey, quoted, plain] of queryParts(text)) {
    if (plain === undefined) {
      const key = quotedKey?.slice(0, -1)
      if (key === undefined || !addFilter(query, key, quoted, keys))
        addText(query, `${quotedKey ?? ""}${quoted}`, true)
      continue
    }
    const colon = plain.indexOf(":")
    const isFilter =
      colon > 0 &&
      addFilter(query, plain.slice(0, colon), plain.slice(colon + 1), keys)
    if (!isFilter) addText(query, plain, false)
  }
  return query
}

export function isEmptyQuery(query: SearchQuery): boolean {
  return (
    query.words.length === 0 &&
    query.phrases.length === 0 &&
    query.tags.length === 0 &&
    query.folders.length === 0 &&
    query.properties.length === 0
  )
}
