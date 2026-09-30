# Data Model: Backlinks

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · Base:
[data-model da 002](../002-links-incorporacao/data-model.md)

Tudo aqui é derivado dos arquivos e recalculado em memória. Nada desta feature é persistido; a
única gravação é a da menção transformada em link, dentro da própria nota.

## Mudanças em entidades existentes

- `LinkIndex` guarda o texto de cada nota e canvas que recebe em `update` e expõe
  `textOf(path): string | undefined`. `rename` leva o texto junto; `remove` o descarta.

## Backlink (derivado)

| Campo | Regra |
| --- | --- |
| `source` | Nota onde o link está escrito; nunca a própria nota aberta |
| `range` | Posição do `[[...]]` no texto da nota de origem |
| `embed` | `true` para `![[...]]` |
| `snippet` | Trecho da linha em volta do link (ver "Trecho") |

Um link conta quando resolve para a nota aberta pela regra da 002 (`linksTo` do índice): link
ambíguo, pendente ou quebrado não conta.

## BacklinkGroup (derivado)

| Campo | Regra |
| --- | --- |
| `source` | Caminho da nota que aponta |
| `name`, `folder` | Para exibir |
| `occurrences` | Backlinks dessa nota, em ordem de posição |

Os grupos vêm em ordem alfabética pelo caminho (FR-003).

## Mention (derivado)

| Campo | Regra |
| --- | --- |
| `source` | Nota onde o nome aparece; nunca a própria nota aberta |
| `start`, `end` | Posição exata no texto cru da nota (com BOM e quebras originais) |
| `text` | O texto como está escrito ("Deploy", "api") |
| `snippet` | Trecho da linha em volta |

- Só existe para notas com nome de 3 caracteres ou mais.
- Palavra inteira: antes e depois não há letra, número, hífen nem sublinhado.
- Sem diferenciar maiúsculas; com os mesmos acentos.
- Fora de trechos de código e de qualquer `[[...]]` (inclusive apelido).
- Agrupadas por nota como os backlinks (`MentionGroup`).

## Trecho

A linha da ocorrência, sem espaços nas pontas. Se passar de 120 caracteres, é cortada em volta da
ocorrência com "…" nas pontas. A ocorrência fica destacada no trecho.

## Texto do link de uma menção

| Situação | Resultado |
| --- | --- |
| Nome da nota aberta é único no vault | `[[texto]]` (o texto como estava) |
| Nome repetido | `[[pasta/nome|texto]]`, sem `.md` |

## LinkMentionOutcome (resultado de linkar)

| Tipo | Quando |
| --- | --- |
| `linked` | Gravado; a menção sai da lista e a nota entra (ou continua) nos links |
| `changed` | O arquivo mudou fora do app desde o cálculo; nada é gravado, o painel é recalculado |
| `failed` | A gravação falhou; nada muda |

## Estado do painel (só na sessão)

| Campo | Regra |
| --- | --- |
| `visible` | Aberto por padrão; alternado pelo botão e por `Ctrl+Shift+B` |
| seção de menções | Recolhida sempre que outra nota é aberta |

## Relações

```text
Note 1 ── * Backlink (outras notas → esta)   agrupados em BacklinkGroup
Note 1 ── * Mention  (outras notas citam o nome)   agrupadas em MentionGroup
Mention 1 ──(linkar)──▶ 1 Backlink
```
