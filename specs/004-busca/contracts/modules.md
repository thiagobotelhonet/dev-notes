# Contratos entre módulos: Busca

Só o que muda ou nasce. Importação entre módulos sempre pelo `index.ts` (NOM-03).

## `features/search` (novo)

```ts
/** Aba "Busca" da barra lateral: campo com sugestões, contagem e resultados (FR-005..021). */
SearchPanel(props: {
  onOpen(path: VaultPath, offset?: number): void
  /** Aumentar põe o foco no campo (atalho Ctrl/Cmd+Shift+F). */
  focusRequest?: number
}): JSX.Element

/** Busca rápida por nome (FR-001..004). `open` controlado por quem monta. */
QuickSearchDialog(props: {
  open: boolean
  onOpenChange(open: boolean): void
  onOpen(path: VaultPath): void
}): JSX.Element
```

- O módulo observa `useVaultStore` (`linkIndex`, `entries`) pelo `@/features/vault` e mantém o
  próprio índice; não grava nada e não conhece o editor.
- Modelo interno em `model/`: `search.query.ts` (dividir a consulta), `search.metadata.ts` (tags e
  propriedades), `search.index.ts` (MiniSearch, reconciliação), `search.occurrences.ts`
  (varredura com posições no arquivo), `search.suggestions.ts` (sugestões de filtro).

## `features/links` (muda o `index.ts`)

```ts
/** Intervalos de código (cerca e inline) de um texto; já usado por parseLinks e findMentions. */
codeRanges(text: string): { start: number; end: number }[]

/** Normalização de texto para comparar sem maiúsculas nem acentos (já usada pelas sugestões). */
foldText(text: string): string
/** A mesma, sem cortar espaços: mantém as posições por caractere (destaque da busca). */
foldTextUntrimmed(text: string): string
```

- Só passam a ser exportadas; o comportamento não muda.

## `shared/lib` (novo)

```ts
/** Trecho da linha em volta de [start, end), cortado em 120 caracteres com "…" (spec 003). */
snippetOf(text: string, start: number, end: number): Snippet
interface Snippet { before: string; match: string; after: string }
```

- Sai de `features/backlinks/model/backlinks.list.ts`, sem mudança de comportamento.

## `shared/components/app-note-list` (muda)

```ts
type NoteListSnippet = {
  key: string
  text: Snippet                  // era `content: ReactNode`; a lista desenha o destaque (FR-025)
  badge?: string
  onOpen(): void
  action?: { label: string; accessibleLabel: string; onClick(): void }
}
type NoteListItem = {
  key: string
  icon: LucideIcon
  title: string
  description: string
  meta?: string                  // novo: ex. "3 ocorrências"
  onOpen?(): void                // novo: escolher a nota (não só um trecho)
  snippets: NoteListSnippet[]
}
```

- O painel de backlinks passa a mandar `text` e para de montar o `<mark>`.

## `app/workspace.tsx` (muda)

- Cabeçalho da barra lateral com as abas "Arquivos" e "Busca" (`Tabs`); a aba "Busca" mostra o
  `SearchPanel`.
- Atalhos: `Ctrl/Cmd+P` (busca rápida), `Ctrl/Cmd+Shift+F` (aba Busca e foco),
  `Ctrl/Cmd+Shift+E` (aba Arquivos), ouvidos na captura com `preventDefault` (research R11).
- `onOpen` da busca → `openNoteAt(path, offset === undefined ? undefined : { offset })`.

## Sem mudança

- `LinkIndex` (`textOf` já existe), `vault.store`, `note.store` (`open(path, { offset })` já
  converte a posição do arquivo), `shared/vault`, `src-tauri/`.
