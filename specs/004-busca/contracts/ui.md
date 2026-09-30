# Contrato de interface: Busca

Textos em pt-BR, exatamente como abaixo. Peças do shadcn (CMP-02); nada de cor pronta (COR-01).

## Abas da barra lateral

- `Tabs` no cabeçalho da barra lateral, variante `line`, com os gatilhos:
  - "Arquivos" (ícone `FolderTree`), `Kbd` com `Ctrl+Shift+E` (`Cmd+Shift+E` no macOS) no `Tooltip`;
  - "Busca" (ícone `Search`), `Kbd` com `Ctrl+Shift+F` (`Cmd+Shift+F`) no `Tooltip`.
- O nome do vault continua acima das abas.
- A aba escolhida vale durante a sessão; ao abrir o app, "Arquivos".

## Busca completa (aba "Busca")

`AppPanel` com título "Busca" e, no corpo:

| Parte | Peça | Texto / comportamento |
| --- | --- | --- |
| Campo | `Combobox` (input do `InputGroup`, ícone `Search`) | placeholder "Buscar nas notas"; `aria-label` "Buscar nas notas"; botão de limpar com `aria-label` "Limpar busca" quando há texto |
| Sugestões | `ComboboxContent` + `ComboboxItem` | valores de `tag:`, `pasta:` e da propriedade digitada; tags com `#`; a primeira vem destacada (`autoHighlight`); Enter ou Tab escolhem, setas mudam o destaque; Esc fecha só a lista |
| Contagem | texto `text-muted-foreground text-xs` | "1 nota" / "{n} notas" |
| Resultados | `AppNoteList` | título = nome; descrição = pasta ou "raiz"; meta = "1 ocorrência" / "{n} ocorrências" (omitida quando só o nome casa); até 3 trechos com o destaque |
| Mais | `Button variant="outline" size="sm"` | "Mostrar mais" quando há mais resultados do que os mostrados |

Estados:

| Estado | O que aparece |
| --- | --- |
| Sem consulta | `AppEmpty` com ícone `Search`, título "Busque por texto ou use filtros" e descrição "Exemplos: deploy tag:#backend, pasta:snippets, linguagem:csharp, \"frase exata\"" |
| Índice em construção | `Skeleton` de três itens com `aria-busy` e "Preparando a busca…" só para leitor de tela |
| Sem resultado | `AppEmpty` com ícone `SearchX` e título "Nenhuma nota corresponde à busca." |

- Escolher o nome da nota: abre na primeira ocorrência (ou no começo, se só o nome casa).
- Escolher um trecho: abre com o cursor na ocorrência.
- O foco continua no campo enquanto se digita; `Tab` passa às sugestões ou aos resultados.

## Busca rápida

`CommandDialog` (título para leitor de tela "Abrir nota", descrição "Digite parte do nome da nota").

| Parte | Texto / comportamento |
| --- | --- |
| Campo | `CommandInput` com placeholder "Nome da nota" |
| Itens | ícone `FileText`, nome e, à direita, a pasta ou "raiz" em `text-muted-foreground text-xs`; no máximo 50 |
| Sem texto | `CommandEmpty` "Digite parte do nome da nota." |
| Nada casa | `CommandEmpty` "Nenhuma nota com esse nome." |
| Teclado | setas movem; Enter abre e fecha; Esc fecha sem abrir |

- Botão de abrir: no cabeçalho da barra lateral, `Button variant="ghost" size="icon-sm"` com
  `aria-label` "Abrir nota pelo nome", ícone `FileSearch`, com `Tooltip` "Abrir nota pelo nome" e
  `Kbd` `Ctrl+P` (`Cmd+P`), no formato de atalho que o app já usa (`Ctrl+Shift+B`).

## Destaque

- A ocorrência no trecho usa `bg-brand/20 text-foreground`, desenhada só pelo `app-note-list`
  (research R12). Registrada no `docs/brand.md` como "Destaque de ocorrência".
