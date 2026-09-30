# Contrato: módulo `links` depois da 002

**Base**: o contrato da 001 continua (`createLinkIndex`, `LinkIndex`, `affectedByMoves`,
`planChange`, `ChangePlan`, `EntryMove`, `fileMoves`). A 002 só acrescenta; nada muda de
assinatura.

Tudo abaixo é função pura em `features/links/model/` e sai pelo `index.ts` só se outro módulo usar
(NOM-06).

## Exports novos

```ts
/** Destino de um link com o seu estado (data-model "LinkTarget"). */
resolveLinkTarget(input: {
  link: Pick<LinkOccurrence, "target" | "subpath">
  from: VaultPath               // nota onde o link está escrito
  index: LinkIndex
  entries: VaultEntry[]         // para arquivos que não são nota
  deleted: DeletedNotes         // registro de notas excluídas
}): LinkTarget

/** Links de um texto, com posição, para o editor destacar. Reexporta o parser da 001, que já
 * descarta destino vazio (`[[]]`, `[[#Seção]]`). */
parseLinks(source: VaultPath, text: string): LinkOccurrence[]

/** Seções de uma nota e busca por título (data-model "Section"). */
findSection(text: string, heading: string): Section | null

/** Sugestões do autocomplete (data-model "LinkSuggestion"). */
suggestLinks(query: string, notes: VaultEntry[]): LinkSuggestion[]   // no máximo 50

/** O que um bloco de incorporação mostra (data-model "EmbedNode"): conteúdo, seção, vazia,
 * não encontrada, circular, ambígua, tipo não suportado ou profunda demais. */
embedState(input: { target: LinkTarget; chain: VaultPath[]; depth: number; text?: string }): EmbedState

/** Registro de notas excluídas: formato, leitura tolerante e atualização. */
parseDeletedNotes(json: string | null): DeletedNotes,
serializeDeletedNotes(notes: DeletedNotes): string,
withDeleted(notes, paths, at): DeletedNotes, withoutExisting(notes, entries): DeletedNotes

/** Tipos. */
type LinkTarget, type LinkState, type Section, type DeletedNotes, type EmbedState,
type LinkOccurrence
```

- `resolveLinkTarget` é a única regra de resolução usada por destaque, seguir link e incorporação.
  O `resolve` do índice (001) continua para a reescrita ao renomear e mover.

## Quem usa

| Consumidor | Usa |
| --- | --- |
| `features/vault` | `resolveLinkTarget` (em `followLink`), funções do registro de excluídas |
| `features/editor` | `parseLinks`, `resolveLinkTarget`, `findSection`, `suggestLinks`, `embedState` |
