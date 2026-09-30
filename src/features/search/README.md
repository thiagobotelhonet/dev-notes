# search

As duas buscas da RN-BUSCA-005. Dono das regras `RN-BUSCA-*`
(`docs/regras-de-negocio.md` §6.9) e da spec `specs/004-busca/`.

## Contrato (`index.ts`)

| Export | Para quê |
|---|---|
| `QuickSearchDialog` | busca rápida por nome; recebe `open`, `onOpenChange` e `onOpen(path)` |
| `SearchPanel` | aba "Busca" da barra lateral; recebe `onOpen(path, offset?)` e `focusRequest` (aumentar põe o foco no campo, atalho `Ctrl+Shift+F`) |

O módulo não grava nada e não conhece o editor: quem abre a nota é o `app/`,
pelo `onOpen`.

## Busca rápida (RN-BUSCA-003, 005)

- `Ctrl+P` (`Cmd+P` no macOS) ou o botão "Abrir nota pelo nome" do cabeçalho
  da barra lateral. O atalho é ouvido na captura e com `preventDefault`: no
  WebView2, `Ctrl+P` abre a impressão se ninguém impedir.
- Lista as notas pela mesma regra do autocomplete de links (`suggestLinks` do
  módulo `links`): sem diferenciar maiúsculas nem acentos; primeiro o nome que
  começa com o texto, depois o nome que contém, depois só a pasta que contém;
  no máximo 50. Canvas e outros arquivos não aparecem.
- Enter abre a primeira (ou a escolhida pelas setas) e fecha; Esc fecha sem
  abrir. A edição pendente da nota atual é gravada antes (spec 001).

## Busca completa (RN-BUSCA-001, 003, 004, 005)

- Aba "Busca" da barra lateral, ao lado de "Arquivos"; `Ctrl+Shift+F` mostra
  a aba com o foco no campo e `Ctrl+Shift+E` volta à árvore. A consulta é
  estado do painel; as abas ficam montadas, então ela sobrevive à troca de aba.
- Procura no nome e no arquivo inteiro: texto, blocos de código, tags e
  propriedades (que estão no texto).
- Sem diferenciar maiúsculas nem acentos. Cada palavra casa com o início de uma
  palavra do texto (`depl` acha "deploy"); hífen, sublinhado e ponto separam
  partes (`gateway` acha "api-gateway"), mas "api" não acha "rapidamente".
- Várias palavras: todas na mesma nota. Entre aspas: a sequência exata.
  Palavra com separador (`api-gateway`) vale como sequência das partes.
- Ordem: notas com todas as palavras no nome primeiro; depois a relevância;
  empate pelo caminho.
- Cada resultado mostra a pasta, a quantidade de ocorrências e até 3 trechos,
  com o destaque do `app-note-list`. O trecho abre a nota na ocorrência; o
  nome abre na primeira ocorrência, ou no começo se só o nome casou. Mostra
  100 resultados; "Mostrar mais" acrescenta 100.
- Só notas Markdown visíveis na árvore; canvas e pastas ocultas ficam fora.
- Buscar nunca grava arquivo.

## Filtros (RN-BUSCA-002, RN-TAG-001, RN-TAG-002)

- No mesmo campo e combinados com o texto: `tag:`, `pasta:` e o nome de
  qualquer propriedade que exista no vault (`linguagem:csharp`). Tudo vale
  junto, inclusive filtros repetidos (`tag:#backend tag:#urgente`).
- Valor com espaço entre aspas (`pasta:"minhas notas"`); filtro sem valor é
  ignorado; sem diferenciar maiúsculas nem acentos.
- `chave:valor` em que a chave não é `tag`, `pasta` nem uma propriedade
  conhecida é texto: `http://intranet` procura "http intranet".
- `tag:#x` (com ou sem `#`) inclui as notas com `#x` e com `#x/...`; nunca a
  tag mãe. `pasta:x` inclui a pasta e as subpastas, a partir da raiz.
  Propriedade: o valor igual; em lista, basta um item.
- Só filtros, sem texto: todas as notas que passam, na ordem do caminho.

### De onde vêm tags e propriedades

Lidas do texto, só para a busca; nada é reescrito. Os módulos de tags e de
propriedades vão reaproveitar a mesma leitura.

- Tag: `#` no começo da linha ou depois de espaço, seguido de letras,
  números, `_`, `-` e `/`, com pelo menos uma letra. Não é tag: `#123`,
  `C#`, `issue#12`, título (`# Título`), nem o que está em código ou dentro de
  link. A propriedade `tags` (lista ou texto separado por vírgula) também
  conta; lembre que em YAML `#` depois de espaço é comentário, então use aspas.
- Propriedades: só o bloco entre `---` no topo da nota (depois do BOM), lido
  com `yaml`. Texto, número, sim/não e data viram texto como escritos; lista
  vira vários valores; objeto aninhado é ignorado. Bloco malformado não gera
  propriedade e continua pesquisável como texto.

## Sugestões (RN-BUSCA-006)

- Ao digitar o valor de `tag:`, `pasta:` ou de uma propriedade conhecida, a
  lista do campo (`Combobox`) sugere o que existe no vault: tags com `#`,
  pastas da árvore e valores da propriedade. Sem diferenciar maiúsculas nem
  acentos; primeiro o que começa com o texto, depois o que contém; até 20.
- Só vale o pedaço em que está o cursor. A primeira sugestão já vem
  destacada: Enter ou Tab a escolhem, as setas mudam o destaque. Escolher
  troca só esse pedaço (com aspas se o valor tem espaço) e a busca roda de
  novo. Esc fecha só a lista e mantém a consulta.

## Índice

- O texto vem do índice de links (`textOf`); nada é lido do disco para buscar.
- O índice (MiniSearch) nasce quando o índice de links fica pronto, em lotes de
  500 notas, devolvendo o controle entre um lote e outro.
- Depois, 300 ms após cada mudança em `entries`, se reconcilia com o vault:
  nota nova entra, a que sumiu sai, texto diferente é trocado. Isso cobre
  gravar, alteração externa, renomear, mover, excluir e linkar menção, sem
  ouvir cada evento.
- As ocorrências (posições no arquivo, com BOM e CRLF) são calculadas só para
  os resultados mostrados.

## Testes

- Vitest cobre a busca inteira. No Playwright (`e2e/search.spec.ts`) fica só o
  `Ctrl+P`: é o único caso que precisa de um navegador de verdade, para
  conferir que o atalho não abre a impressão (TST-07).
