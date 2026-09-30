import { create } from "zustand"
import { useVaultStore } from "@/features/vault"
import { isHiddenPath } from "@/shared/vault"
import {
  createSearchIndex,
  type SearchIndex,
  type SearchNote,
} from "./model/search.index"
import { parseQuery } from "./model/search.query"
import { suggestFilterValues } from "./model/search.suggestions"

type SearchStatus = "idle" | "building" | "ready"

const reconcileDelayMs = 300

/** Only the state of the vault-wide index (ADR-007, EST-03); what the user typed stays in the panel. */
interface SearchState {
  status: SearchStatus
  /** Bumped after every sync, so views search again. */
  revision: number
}

export const useSearchStore = create<SearchState>()(() => ({
  status: "idle",
  revision: 0,
}))

let index: SearchIndex = createSearchIndex()
let running: Promise<void> = Promise.resolve()
let generation = 0
let reconcileTimer: ReturnType<typeof setTimeout> | undefined

/** Only Markdown notes visible in the tree are searched (FR-024). */
function wantedNotes(): SearchNote[] | null {
  const { linkIndex, entries } = useVaultStore.getState()
  if (!linkIndex) return null
  return entries
    .filter((entry) => entry.kind === "note" && !isHiddenPath(entry.path))
    .map((entry) => ({
      path: entry.path,
      text: linkIndex.textOf(entry.path) ?? "",
    }))
}

/** Syncs run one after another; each reads the vault as it is when it starts. */
function sync() {
  running = running.then(async () => {
    const wanted = wantedNotes()
    if (!wanted) return
    const started = generation
    await index.sync(wanted)
    if (started !== generation) return
    useSearchStore.setState((state) => ({
      status: "ready",
      revision: state.revision + 1,
    }))
  })
  return running
}

function rebuild(ready: boolean) {
  generation++
  clearTimeout(reconcileTimer)
  reconcileTimer = undefined
  index = createSearchIndex()
  useSearchStore.setState({ status: ready ? "building" : "idle" })
  if (ready) void sync()
}

/* Research R3: every change reaches entries and the text kept by the link index. */
useVaultStore.subscribe((state, previous) => {
  if (state.linkIndex !== previous.linkIndex) rebuild(state.linkIndex !== null)
  else if (state.entries !== previous.entries && state.linkIndex) {
    clearTimeout(reconcileTimer)
    reconcileTimer = setTimeout(() => {
      reconcileTimer = undefined
      void sync()
    }, reconcileDelayMs)
  }
})
if (useVaultStore.getState().linkIndex) rebuild(true)

/** Resolves when pending changes are in the index (tests and the performance check). */
export async function whenSearchReady() {
  if (reconcileTimer) {
    clearTimeout(reconcileTimer)
    reconcileTimer = undefined
    void sync()
  }
  let current: Promise<void>
  do {
    current = running
    await current
  } while (current !== running)
}

export function searchNotes(text: string) {
  return index.search(parseQuery(text, index.metadata().propertyKeys))
}

/** The same split the search uses, with the property names of the open vault. */
export function parseSearchQuery(text: string) {
  return parseQuery(text, index.metadata().propertyKeys)
}

/** Suggestions for the filter under the cursor (RN-BUSCA-006); folders come from the tree. */
export function suggestFilters(text: string, cursor: number) {
  const folders = useVaultStore
    .getState()
    .entries.filter(
      (entry) => entry.kind === "folder" && !isHiddenPath(entry.path)
    )
    .map((entry) => entry.path)
  return suggestFilterValues(text, cursor, index.metadata(), folders)
}
