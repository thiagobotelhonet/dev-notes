# editor

A nota aberta: leitura, edição, gravação automática e a convivência com
alterações feitas fora do app (`RN-NOTA-007`, `RN-NOTA-008`).

## Contrato (`index.ts`)

| Export | Para quê |
|---|---|
| `NoteEditor` | editor da nota aberta, dentro do `app-editor-frame`; recebe `onFollowLink` e `actions` (botões do cabeçalho) |
| `useNoteStore` | nota aberta, edição pendente e as ações (`open(path, { heading } | { offset })`, `edit`, `flush`…) |

O editor depende do `vault` (ganchos `onBeforeMutate` e `onEntryEvent`); o
`vault` nunca importa o editor.

## Exceção ao shadcn (LAY-07)

O editor usa CodeMirror 6 (ADR-004), porque o shadcn não tem editor de texto.
Ele fica dentro do `app-editor-frame`, com tema feito só de tokens do
`styles.css` (COR-01). Tudo em volta (cabeçalho, indicador, diálogos) é shadcn.
O destaque dos links (`model/editor.links.ts`) também é CodeMirror e fica
dentro da mesma exceção.

## Links (spec 002)

- Cada `[[...]]` fora de código aparece com o traço do seu estado, e o estado
  também vai na dica ao passar o mouse (research R2):

  | Estado | Aparência |
  | --- | --- |
  | válido | texto normal, sublinhado contínuo em `--brand` |
  | pendente | texto secundário, sublinhado tracejado |
  | quebrado | texto em `--destructive`, tachado |
  | ambíguo | texto normal, sublinhado ondulado em `--brand` |
  | arquivo | texto normal, sublinhado pontilhado |

- Seguir link: `Ctrl`+clique (`Cmd`+clique no macOS) ou `Ctrl+Enter`
  (`Cmd+Enter`) com o cursor no link. O clique simples só posiciona o cursor.
  Fora de um link, `Ctrl+Enter` mantém o comportamento padrão.
- O editor não decide nada: chama `onFollowLink(link, nota de origem)`, e o
  `app/` usa o `followLink` do `vault` para abrir, criar ou perguntar.
- O estado é recalculado só nas linhas visíveis, quando o texto muda ou quando
  mudam as notas do vault ou o registro de notas excluídas (research R9).
- Link para seção abre a nota com o cursor no título (`open(path, { heading
  })`); seção inexistente abre no início.
- Um trecho do painel de backlinks (spec 003) abre a nota com o cursor na
  posição do link (`open(path, { offset })`), rolando até ela. Pedir a mesma
  posição de novo move o cursor outra vez. O `offset` é do arquivo, como o
  índice de links vê (com BOM e CRLF); o editor converte para o texto dele
  (`editorOffset`).

## Incorporação (`![[nota]]`, RN-EMBED-001..003)

- A linha `![[nota]]` continua visível e editável; logo abaixo dela aparece um
  bloco somente leitura com o nome da nota, a ação "Abrir" e o conteúdo (ou só
  a seção, em `![[nota#Seção]]`).
- O conteúdo é um editor CodeMirror aninhado, somente leitura, com os mesmos
  links (destaque e `Ctrl`+clique, a partir da nota incorporada) e as próprias
  incorporações, até 5 níveis; o 6º nível mostra só o `![[...]]`.
- O bloco relê a nota quando ela muda, pelo app ou por outra ferramenta
  (eventos `external`, `rewritten`, `moved` e `removed` do vault), e muda de
  estado quando ela é excluída ou volta a existir.
- Mensagens com ícone e texto: nota não encontrada, seção não encontrada,
  incorporação circular (inclusive da própria nota), nota vazia, nome repetido
  e tipo não suportado. A regra de qual estado mostrar é `embedState`, da
  feature `links`.
- Nada é gravado: a nota que incorpora continua só com o texto `![[...]]`
  (FR-024).
- Como está montado: `model/editor.embeds.ts` é só CodeMirror (um `StateField`,
  porque decoração de bloco não pode vir de `ViewPlugin`); o conteúdo do
  widget é uma raiz React com `components/embed-block.tsx`, para o cabeçalho e
  as mensagens serem shadcn (princípio IV). O motivo está no plan da spec 002,
  "Complexity Tracking". Cliques e teclas dentro do bloco não mexem no cursor
  da nota em volta.
- `editor.vault.ts` é a ponte do editor com o vault para links e
  incorporações: resolver um link, ler uma nota, saber quando ela mudou.

## Autocomplete de links (`model/editor.complete.ts`)

- Abre ao digitar `[[` ou `![[` fora de código; a regra de "fora de código" é
  a do parser de links, a mesma do destaque.
- A ordem vem pronta do `suggestLinks` (feature `links`) e o CodeMirror não
  reordena (`filter: false`). Cada item mostra o nome e a pasta ("raiz" na
  raiz).
- Setas navegam, `Enter` ou `Tab` escolhem, `Esc` fecha sem inserir; continuar
  digitando refaz a lista. Nos primeiros 75 ms depois de abrir, as teclas
  seguem para o texto (`interactionDelay` do CodeMirror), para quem digita
  rápido não escolher sem querer.
- Escolher insere o nome, ou `pasta/nome` quando o nome é repetido, e fecha com
  `]]` sem duplicar colchetes já escritos.
- Sem nenhuma nota correspondente, a lista mostra "Nenhuma nota encontrada.
  Continue digitando para criar um link novo."; escolher esse item não insere
  nada.
- A lista é do CodeMirror, dentro do `app-editor-frame` (LAY-07), com tema só
  de tokens.

## Máquina de estados

`clean`, `dirty`, `saving`, `conflict` e `missing`, como o diagrama
"OpenNote" de `specs/001-vault-notas/data-model.md`, em
`model/note.machine.ts`. Edição pendente é `dirty`, `saving`, `conflict` ou
`missing` quando havia algo não gravado.

## Gravação automática (research R12)

- 1 s depois da última tecla, e na hora ao trocar de nota, ao perder o foco da
  janela e ao fechar o app (a janela espera a gravação; se ela falhar, a janela
  não fecha).
- Antes de gravar, o arquivo é lido de novo e comparado com o último conteúdo
  que o app conhece. Mudou fora do app? Não grava: vai para conflito. Sumiu? Vai
  para `missing`, sem recriar.
- Quebra de linha (LF ou CRLF) e BOM do arquivo original são preservados
  (FR-004).
- Em conflito nada é gravado sozinho.

## Alteração externa (US4)

| Situação | O que acontece |
|---|---|
| Sem edição pendente | o conteúdo novo aparece sozinho (RN-NOTA-007) |
| Com edição pendente | diálogo "“nome” foi alterada fora do Dev Notes": manter a versão do app ou usar a do arquivo; nada é gravado antes da escolha (RN-NOTA-008) |
| Nota excluída fora | tela "Esta nota foi excluída fora do Dev Notes"; com edição pendente, "Recriar com este conteúdo" |
| Gravação do próprio app | nunca abre o diálogo (FR-023) |
| Links reescritos pelo app (renomear, mover) | o editor recarrega a nota aberta pelo evento `rewritten` |
