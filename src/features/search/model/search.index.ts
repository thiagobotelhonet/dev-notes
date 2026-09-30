import MiniSearch from "minisearch"
import { foldText, foldTextUntrimmed } from "@/features/links"
import { basenameOf, parentOf, type VaultPath } from "@/shared/vault"
import {
  mergeMetadata,
  type NoteMetadata,
  readMetadata,
  type SearchMetadata,
} from "./search.metadata"
import { matchesFolded } from "./search.occurrences"
import type { SearchQuery } from "./search.query"

export interface SearchNote {
  path: VaultPath
  text: string
}

/** A found note, without occurrences: those are computed only for what is shown (research R8). */
export interface SearchResult {
  path: VaultPath
  name: string
  folder: VaultPath
  /** Every word and phrase is in the name (RN-BUSCA-004). */
  inName: boolean
  score: number
}

interface IndexedNote {
  text: string
  name: string
  foldedName: string
  foldedText: string
  foldedPath: string
  metadata: NoteMetadata
  foldedTags: string[]
  foldedProperties: Map<string, string[]>
}

/** Research R4, RN-TAG-002: a tag filter includes the children, never the parent. */
const hasTag = (tags: string[], wanted: string) =>
  tags.some((tag) => tag === wanted || tag.startsWith(`${wanted}/`))

function passesFilters(note: IndexedNote, query: SearchQuery) {
  return (
    query.tags.every((tag) => hasTag(note.foldedTags, tag)) &&
    query.folders.every((folder) => note.foldedPath.startsWith(`${folder}/`)) &&
    query.properties.every(({ key, value }) =>
      note.foldedProperties.get(key)?.includes(value)
    )
  )
}

const batchSize = 500

/** Research R1–R3: MiniSearch finds and ranks; phrases and name matches are checked on folded text. */
export function createSearchIndex() {
  const engine = new MiniSearch<{ id: VaultPath; name: string; text: string }>({
    fields: ["name", "text"],
    /* NFC first: a decomposed accent must not split a word. */
    tokenize: (text) =>
      text
        .normalize("NFC")
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean),
    processTerm: (term) => foldText(term) || null,
    searchOptions: { prefix: true, combineWith: "AND", boost: { name: 3 } },
  })
  const notes = new Map<VaultPath, IndexedNote>()
  let merged: SearchMetadata | null = null

  const put = ({ path, text }: SearchNote) => {
    const name = basenameOf(path)
    const document = { id: path, name, text }
    if (engine.has(path)) engine.replace(document)
    else engine.add(document)
    const metadata = readMetadata(text)
    notes.set(path, {
      text,
      name,
      foldedName: foldTextUntrimmed(name),
      foldedText: foldTextUntrimmed(text),
      foldedPath: foldText(path),
      metadata,
      foldedTags: metadata.tags.map(foldText),
      foldedProperties: new Map(
        [...metadata.properties].map(([key, values]) => [
          foldText(key),
          values.map(foldText),
        ])
      ),
    })
    merged = null
  }

  /** Makes the index match `wanted`: new notes enter, gone ones leave, changed text is replaced. */
  const sync = async (wanted: SearchNote[]) => {
    const paths = new Set(wanted.map((note) => note.path))
    for (const path of [...notes.keys()])
      if (!paths.has(path)) {
        engine.discard(path)
        notes.delete(path)
        merged = null
      }
    const changed = wanted.filter(
      (note) => notes.get(note.path)?.text !== note.text
    )
    for (let start = 0; start < changed.length; start += batchSize) {
      for (const note of changed.slice(start, start + batchSize)) put(note)
      /* Yield between batches so the tree and the editor keep responding (SC-004). */
      if (start + batchSize < changed.length)
        await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  /** Tags, property names and values in the vault (filters and suggestions). */
  const metadata = (): SearchMetadata => {
    merged ??= mergeMetadata([...notes.values()].map((note) => note.metadata))
    return merged
  }

  const search = (query: SearchQuery): SearchResult[] => {
    const terms = [...query.words, ...query.phrases.flat()]
    const filtered =
      query.tags.length + query.folders.length + query.properties.length > 0
    if (terms.length === 0 && !filtered) return []
    /* Only filters: every note is a candidate, ordered by path (R7). */
    const hits =
      terms.length > 0
        ? engine.search(terms.join(" "))
        : [...notes.keys()].map((id) => ({ id, score: 0 }))
    const results: SearchResult[] = []
    for (const hit of hits) {
      const path = hit.id as VaultPath
      const note = notes.get(path)
      if (!note || !passesFilters(note, query)) continue
      const phrasesFound = query.phrases.every(
        (phrase) =>
          matchesFolded(note.foldedName, { words: [], phrases: [phrase] }) ||
          matchesFolded(note.foldedText, { words: [], phrases: [phrase] })
      )
      if (!phrasesFound) continue
      results.push({
        path,
        name: note.name,
        folder: parentOf(path),
        inName: terms.length > 0 && matchesFolded(note.foldedName, query),
        score: hit.score,
      })
    }
    return results.sort(
      (a, b) =>
        Number(b.inName) - Number(a.inName) ||
        b.score - a.score ||
        a.path.localeCompare(b.path)
    )
  }

  return { sync, search, metadata }
}

export type SearchIndex = ReturnType<typeof createSearchIndex>
