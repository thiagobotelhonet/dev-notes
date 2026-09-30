import { FileTextIcon, SearchIcon, SearchXIcon, XIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useVaultStore } from "@/features/vault"
import { AppEmpty } from "@/shared/components/app-empty"
import {
  AppNoteList,
  type NoteListItem,
} from "@/shared/components/app-note-list"
import { AppPanel } from "@/shared/components/app-panel"
import { Button } from "@/shared/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/shared/components/ui/combobox"
import {
  InputGroupAddon,
  InputGroupButton,
} from "@/shared/components/ui/input-group"
import { Skeleton } from "@/shared/components/ui/skeleton"
import type { VaultPath } from "@/shared/vault"
import { findOccurrences } from "../model/search.occurrences"
import { isEmptyQuery } from "../model/search.query"
import {
  parseSearchQuery,
  searchNotes,
  suggestFilters,
  useSearchStore,
} from "../search.store"

/** Research R13: SC-002 counts from here. */
const searchDelayMs = 150

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

const pageSize = 100

/** Full search in the left sidebar (RN-BUSCA-001, 003, 004; contracts/ui.md). */
export function SearchPanel({
  onOpen,
  focusRequest = 0,
}: {
  onOpen: (path: VaultPath, offset?: number) => void
  /** Bumped by whoever wants the field focused (Ctrl+Shift+F). */
  focusRequest?: number
}) {
  const status = useSearchStore((state) => state.status)
  const revision = useSearchStore((state) => state.revision)
  /* Typed text is the panel's own state (EST-03); the sidebar keeps the panel mounted. */
  const [query, setTypedQuery] = useState("")
  const [limit, setLimit] = useState(pageSize)
  const setQuery = (next: string) => {
    setTypedQuery(next)
    setLimit(pageSize)
  }
  const showMore = () => setLimit((current) => current + pageSize)
  const input = useRef<HTMLInputElement>(null)
  const [searched, setSearched] = useState(query)
  const [listOpen, setListOpen] = useState(false)
  const highlighted = useRef<string | undefined>(undefined)

  useEffect(() => {
    const timer = setTimeout(() => setSearched(query), searchDelayMs)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (focusRequest) input.current?.focus()
  }, [focusRequest])

  /* Property names come from the vault, so the split follows the index. */
  const parsed = useMemo(() => {
    void revision
    return parseSearchQuery(searched)
  }, [searched, revision])
  const results = useMemo(() => {
    void revision
    return status === "ready" ? searchNotes(searched) : []
  }, [searched, status, revision])

  /* Occurrences only for what is shown, and not again on every keystroke (research R8). */
  const items = useMemo(
    () =>
      results.slice(0, limit).map((result): NoteListItem => {
        const text =
          useVaultStore.getState().linkIndex?.textOf(result.path) ?? ""
        const { count, occurrences } = findOccurrences(text, parsed)
        return {
          key: result.path,
          icon: FileTextIcon,
          title: result.name,
          description: result.folder || "raiz",
          meta: count ? plural(count, "ocorrência", "ocorrências") : undefined,
          onOpen: () => onOpen(result.path, occurrences[0]?.start),
          snippets: occurrences.map((occurrence) => ({
            key: String(occurrence.start),
            text: occurrence.snippet,
            onOpen: () => onOpen(result.path, occurrence.start),
          })),
        }
      }),
    [results, limit, parsed, onOpen]
  )

  /* RN-BUSCA-006: values for the filter under the cursor; choosing replaces only that part. */
  const cursor = input.current?.selectionStart ?? query.length
  const suggestion = useMemo(() => {
    void revision
    return status === "ready" ? suggestFilters(query, cursor) : null
  }, [query, cursor, status, revision])
  const options = suggestion?.options ?? []
  const labels = new Map(options.map((option) => [option.insert, option.label]))
  const choose = (insert: string) => {
    if (!suggestion) return
    setQuery(
      query.slice(0, suggestion.start) + insert + query.slice(suggestion.end)
    )
    setListOpen(false)
  }

  return (
    <AppPanel title="Busca">
      <Combobox
        items={options.map((option) => option.insert)}
        filter={null}
        autoHighlight
        value={null}
        onValueChange={(value) => {
          if (value) choose(value)
        }}
        inputValue={query}
        onInputValueChange={(value, details) => {
          /* Choosing or Esc must not overwrite the query; only typing does. */
          if (details.reason === "input-change") setQuery(value)
        }}
        open={listOpen && options.length > 0}
        onOpenChange={setListOpen}
        onItemHighlighted={(value) => {
          highlighted.current = value ?? undefined
        }}
      >
        <ComboboxInput
          ref={input}
          aria-label="Buscar nas notas"
          placeholder="Buscar nas notas"
          showTrigger={false}
          onKeyDown={(event) => {
            if (event.key !== "Tab" || !listOpen || !highlighted.current) return
            event.preventDefault()
            choose(highlighted.current)
          }}
        >
          <InputGroupAddon align="inline-start">
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          {query && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Limpar busca"
                onClick={() => {
                  setQuery("")
                  input.current?.focus()
                }}
              >
                <XIcon aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </ComboboxInput>
        <ComboboxContent>
          <ComboboxList>
            {(insert: string) => (
              <ComboboxItem key={insert} value={insert}>
                {labels.get(insert) ?? insert}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {status !== "ready" ? (
        <div aria-busy="true" className="flex flex-col gap-2 p-1">
          <span className="sr-only">Preparando a busca…</span>
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : !query.trim() || isEmptyQuery(parsed) ? (
        <AppEmpty
          icon={SearchIcon}
          title="Busque por texto ou use filtros"
          description='Exemplos: deploy tag:#backend, pasta:snippets, linguagem:csharp, "frase exata"'
        />
      ) : results.length === 0 ? (
        <AppEmpty
          icon={SearchXIcon}
          title="Nenhuma nota corresponde à busca."
        />
      ) : (
        <>
          <p className="px-1 text-muted-foreground text-xs">
            {plural(results.length, "nota", "notas")}
          </p>
          <AppNoteList items={items} />
          {results.length > limit && (
            <Button variant="outline" size="sm" onClick={showMore}>
              Mostrar mais
            </Button>
          )}
        </>
      )}
    </AppPanel>
  )
}
