# Contrato: módulos depois da 003

Só o que muda. O resto das specs 001 e 002 continua valendo; nenhuma assinatura existente muda.
`shared/vault` não muda (nenhuma capacidade nova de sistema).

## `features/links` (acrescenta)

```ts
/** Menções do nome da nota num texto (data-model "Mention"): palavra inteira, sem diferenciar
 * maiúsculas, com os mesmos acentos, fora de código e de `[[...]]`. Nome com menos de 3
 * caracteres devolve []. */
findMentions(text: string, name: string): { start: number; end: number; text: string }[]

/** Se as menções de uma nota com esse nome são procuradas (3 caracteres ou mais, FR-009). */
mentionsSearched(name: string): boolean

/** Texto que substitui a menção: `[[texto]]` se o nome é único; `[[pasta/nome|texto]]` se é
 * repetido (data-model "Texto do link de uma menção"). */
mentionLink(input: { target: VaultPath; text: string; entries: VaultEntry[] }): string
```

- `LinkIndex` ganha `textOf(path): string | undefined` (texto recebido no último `update`).

## `features/vault` (acrescenta à store)

```ts
/** Transforma uma menção em link na nota `mention.path`, apontando para `target`. */
linkMention(
  mention: { path: VaultPath; start: number; end: number; text: string },
  target: VaultPath
): Promise<"linked" | "changed" | "failed">
```

- Grava a nota aberta antes (`onBeforeMutate`), confere o arquivo com o texto do índice e com o
  trecho, troca só o intervalo, grava pelo `storage.writeText`, atualiza índice e `entries` e
  emite `rewritten`. Os avisos de [ui.md](./ui.md) são do painel, pelo resultado.

## `features/editor` (muda uma opção)

```ts
open(path: VaultPath, options?: { heading?: string; offset?: number }): Promise<void>
```

- `offset`: posição no arquivo da nota (texto cru, com BOM e CRLF, como o índice vê); o editor
  converte para o texto dele, põe o cursor ali e rola até lá.
- `NoteEditor` ganha `actions?: ReactNode`, repassado ao cabeçalho do `AppEditorFrame` (o botão de
  mostrar e esconder o painel).

## `features/backlinks` (novo)

```ts
/** Painel de backlinks e menções da nota aberta (LAY-03). Não grava nem abre notas sozinho. */
BacklinksPanel(props: {
  path: VaultPath
  onOpen(path: VaultPath, offset: number): void
  onClose(): void
}): JSX.Element
```

- Modelo interno em `model/`: agrupar `linksTo` e `findMentions` por nota e montar o trecho.

## `shared/components` (novo e muda)

```ts
/** LAY-03: cabeçalho (título + ações), rolagem e estado vazio. */
AppPanel(props: { title: string; actions?: ReactNode; children: ReactNode }): JSX.Element

/** LAY-02: notas com ícone, nome, pasta e trechos clicáveis, cada um com ação opcional. */
AppNoteList(props: { items: NoteListItem[] }): JSX.Element
type NoteListItem = {
  key: string
  icon: LucideIcon
  title: string
  description: string            // pasta ("raiz" na raiz)
  snippets: {
    key: string
    content: ReactNode           // trecho com a ocorrência destacada
    badge?: string               // ex.: "incorporação"
    onOpen(): void
    action?: { label: string; accessibleLabel: string; onClick(): void }
  }[]
}
```

- `AppShell` ganha `aside?: ReactNode`: o lado direito, num `ResizablePanel`.
- `AppEditorFrame` ganha `actions?: ReactNode` no cabeçalho.

## Fluxo de dependências (sem ciclo)

```text
app/ ─→ features/{vault,editor,links,backlinks} ─→ shared/*
features/backlinks ─→ features/vault, features/links
features/vault     ─→ features/links
features/editor    ─→ features/vault, features/links
features/links     ─→ shared/*
```
