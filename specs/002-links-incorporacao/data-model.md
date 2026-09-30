# Data Model: Links e Incorporação

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · Base:
[data-model da 001](../001-vault-notas/data-model.md)

Tudo aqui é derivado dos arquivos e recalculado em memória, exceto o **registro de notas
excluídas**, que é persistido em `.devnotes/` (constituição, princípio II). Nenhuma entidade desta
feature grava nada dentro das notas.

## Entidades que continuam da 001

`LinkOccurrence` (fonte, posição, destino, seção, apelido, `embed`), `LinkIndex`, `VaultEntry` e o
`nameKey` seguem como na 001. Mudanças:

- `VaultEntry` ganha `modifiedAt` (número, milissegundos desde 1970): data de modificação do
  arquivo. É lida na listagem e atualizada pelo vault quando o app grava a nota ou recebe
  alteração externa. Pastas usam `0`.

## LinkTarget (derivado)

Resultado de resolver o destino de um link. Ordem da resolução:

| Ordem | Situação | Estado | Dados |
| --- | --- | --- | --- |
| 1 | Nota encontrada (caminho exato com `/`, ou nome único sem `/`; RN-LINK-004) | `valid` | `path`, `heading?` |
| 2 | Mais de uma nota com o nome (sem `/`) | `ambiguous` | `candidates[]` |
| 3 | Arquivo que não é nota com esse nome ou caminho (ex.: `mapa.canvas`) | `file` | `path`, `kind` |
| 4 | Sem arquivo, mas o caminho (ou, sem `/`, o nome) está no registro de excluídas | `broken` | `path` (o excluído mais recente) |
| 5 | Nenhum dos anteriores | `pending` | `path` de criação (ver abaixo) |

- `heading` vem de `#Seção` (sem `#`). `#^bloco` é ignorado: a nota inteira.
- **Caminho de criação do pendente** (FR-007): destino com `/` → `destino.md`; sem `/` → pasta da
  nota que contém o link + `nome.md`.
- **Nome inválido** (FR-009): `LinkTarget` não valida nomes, porque o módulo `links` não conhece a
  validação da 001, que fica no `vault`. Um link como `[[a:b]]` é `pending`; ao segui-lo, o
  `followLink` valida cada segmento do caminho de criação e devolve `invalid` (ver
  "FollowOutcome"), sem criar nada.
- **Destino vazio**: ocorrência com `target` vazio (`[[]]`, `[[#Seção]]`, `[[|texto]]`) não é
  link nesta spec: o parser da 001 não gera ocorrência para ela, então nada a resolve, destaca,
  segue nem incorpora.

## DeletedNotesRegistry (persistido)

Arquivo `.devnotes/deleted-notes.json`:

| Campo | Tipo | Regra |
| --- | --- | --- |
| `version` | `1` | Versão do formato |
| `notes` | lista de `{ path, deletedAt }` | `path` com `.md`; `deletedAt` em ISO 8601; no máximo 5.000, a mais antiga sai primeiro |

- **Entra**: nota excluída pelo app (cada nota de uma pasta excluída) e nota que some por mudança
  externa com o app aberto.
- **Sai**: quando existe de novo uma nota com aquele caminho (`nameKey` do caminho), seja criada
  pelo app, recriada, restaurada pela lixeira ou criada por outra ferramenta.
- Arquivo ausente, JSON inválido ou versão desconhecida → registro vazio; o próximo salvamento
  regrava no formato atual.
- Renomear ou mover **pelo app** não entra no registro (os links são reescritos pela 001).

## Section (derivado)

| Campo | Regra |
| --- | --- |
| `title` | Texto do título ATX, sem `#` e sem espaços nas pontas |
| `level` | 1 a 6 |
| `from`, `to` | Do início da linha do título até antes do próximo título de nível igual ou menor número |

Títulos dentro de cercas de código não contam. A busca por seção compara sem maiúsculas, sem
acentos e sem espaços nas pontas; havendo dois títulos iguais, vale o primeiro.

## LinkSuggestion (derivado)

| Campo | Regra |
| --- | --- |
| `path` | Nota sugerida |
| `name`, `folder` | Exibidos na lista (FR-014) |
| `insert` | `name` se o nome é único entre as notas; senão `pasta/nome` sem `.md` (FR-015) |
| `group` | 1 = nome começa com o texto; 2 = nome contém; 3 = só a pasta contém |
| `modifiedAt` | Desempate dentro do grupo, mais recente primeiro |

Correspondência sem maiúsculas e sem acentos; no máximo 50 sugestões.

## EmbedNode (derivado, por bloco exibido)

| Campo | Regra |
| --- | --- |
| `source` | Nota onde está o `![[...]]` |
| `target` | `LinkTarget` do destino |
| `chain` | Notas acima deste bloco, da nota aberta até a atual |
| `depth` | 1 na nota aberta; + 1 a cada nível |
| `state` | `loading` → `content` \| `empty` \| `not-found` \| `section-not-found` \| `circular` \| `ambiguous` \| `unsupported` \| `too-deep` |

- `circular`: o destino já está em `chain` (inclui incorporar a própria nota). RN-EMBED-003.
- `too-deep`: `depth > 5`; mostra só o link.
- `not-found`: destino `pending` ou `broken` (RN-EMBED-002). Volta a `content` quando a nota
  passa a existir.
- `ambiguous`: destino `ambiguous`; o bloco pede a pasta e não carrega nenhuma candidata.
- `unsupported`: destino `file` (canvas, imagem…).
- Conteúdo relido quando o vault avisa `external`, `rewritten`, `moved` ou `removed` do caminho do
  destino.

## FollowOutcome (resultado de seguir um link)

| Tipo | Quando | O que o `app/` faz |
| --- | --- | --- |
| `open` | `valid`, ou `pending` depois de criar a nota | Abre a nota (e a seção, se houver) |
| `choose` | `ambiguous` | Diálogo com as candidatas; a escolhida abre |
| `broken` | `broken` | Confirmação "Recriar nota" / "Cancelar" |
| `invalid` | Nome inválido no pendente | Aviso com o motivo |
| `unsupported` | `file` | Aviso "Abrir {tipo} ainda não está disponível" |

A edição pendente da nota aberta é gravada antes de qualquer abertura (FR-012).

## Relações

```text
Note 1 ── * LinkOccurrence ── 1 LinkTarget
LinkTarget(broken) * ── 1 DeletedNotesRegistry
Note 1 ── * Section
EmbedNode 1 ── 1 LinkTarget; EmbedNode 1 ── * EmbedNode (filhos, até profundidade 5)
```
