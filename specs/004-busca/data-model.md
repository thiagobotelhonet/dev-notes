# Data Model: Busca

Tudo aqui é derivado dos arquivos do vault e vive só em memória (constituição, princípio II).
Nada é gravado.

## Consulta (`SearchQuery`)

O que o usuário digitou, já dividido (research R6).

| Campo | Tipo | Regra |
| --- | --- | --- |
| `words` | `string[]` | palavras soltas, normalizadas por `foldText`; cada uma casa com início de palavra |
| `phrases` | `string[][]` | termos em sequência exata: texto entre aspas, ou palavra com separador (`api-gateway`) |
| `tags` | `string[]` | valores de `tag:`, sem `#`, normalizados |
| `folders` | `string[]` | valores de `pasta:`, sem `/` nas pontas, normalizados |
| `properties` | `{ key: string; value: string }[]` | filtros de propriedade, normalizados |

- Consulta vazia: sem palavras, frases nem filtros.
- `chave:valor` só é filtro se a chave for `tag`, `pasta` ou uma propriedade conhecida
  (`SearchMetadata.propertyKeys`); senão entra em `words` como texto.
- Filtro sem valor é descartado.

## Metadados de uma nota (`NoteMetadata`)

Lidos do texto a cada mudança da nota (research R4, R5).

| Campo | Tipo | Regra |
| --- | --- | --- |
| `path` | `VaultPath` | caminho da nota |
| `name` | `string` | nome sem pasta e sem `.md` |
| `folder` | `VaultPath` | pasta (`""` na raiz) |
| `tags` | `string[]` | tags do texto e da propriedade `tags`, sem `#`, como escritas |
| `properties` | `Map<string, string[]>` | nome da propriedade → valores em texto |

- Tag: `#` no começo da linha ou depois de espaço; letras, números, `_`, `-`, `/`; pelo menos uma
  letra; fora de código e de links.
- Propriedades: só o bloco no topo; bloco malformado → sem propriedades.

## Metadados do vault (`SearchMetadata`)

União dos metadados das notas, para os filtros e as sugestões.

| Campo | Tipo | Uso |
| --- | --- | --- |
| `tags` | `string[]` | sugestões de `tag:` (distintas, em ordem alfabética) |
| `folders` | `VaultPath[]` | sugestões de `pasta:` (das `entries` de pasta) |
| `propertyKeys` | `string[]` | reconhecer `chave:` como filtro |
| `propertyValues` | `Map<string, string[]>` | sugestões de valor por propriedade |

## Ocorrência (`SearchOccurrence`)

| Campo | Tipo | Regra |
| --- | --- | --- |
| `start`, `end` | `number` | posições no arquivo (com BOM e CRLF), como o índice de links |
| `snippet` | `Snippet` | `{ before, match, after }` da linha (mesma regra da spec 003) |

## Resultado (`SearchResult`)

| Campo | Tipo | Regra |
| --- | --- | --- |
| `path`, `name`, `folder` | | da nota |
| `inName` | `boolean` | todas as palavras e frases aparecem no nome (grupo 1, RN-BUSCA-004) |
| `score` | `number` | relevância do motor; só ordena dentro do grupo |
| `count` | `number` | total de ocorrências no conteúdo |
| `occurrences` | `SearchOccurrence[]` | até 3, na ordem do texto; calculadas só para os resultados mostrados |

Ordem: `inName` primeiro, depois `score` decrescente, depois `path`. Consulta só de filtros: por
`path`.

## Índice de busca

- Um por vault aberto; nasce vazio quando o índice de links fica pronto e é preenchido em lotes.
- Estados: `building` (lotes em andamento) → `ready`. Troca de vault descarta e recomeça.
- Mantido em dia por reconciliação com `entries` e `textOf` (research R3): entrada nova → indexa;
  entrada que sumiu → descarta; texto diferente → substitui.

## Estado do índice (`useSearchStore`, ADR-007)

| Campo | Tipo | Uso |
| --- | --- | --- |
| `status` | `idle`, `building` ou `ready` | sem vault, índice em construção ou pronto |
| `revision` | `number` | aumenta a cada reconciliação, para as telas buscarem de novo |

O texto digitado e o limite de resultados (100, +100 por "Mostrar mais", volta a 100 quando a
consulta muda) são estado do `SearchPanel` (EST-03); as abas ficam montadas, então a consulta
sobrevive à troca de aba.
