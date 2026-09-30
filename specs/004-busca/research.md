# Research: Busca

Decisões técnicas da spec 004. Cada uma com a escolha, o porquê e o que foi descartado.

## R1. Motor de busca: MiniSearch para achar e ordenar, varredura própria para os trechos

- **Decision**: `minisearch` 7.2.0 (MIT, sem dependências, roda no navegador) indexa, por nota, os
  campos `name` (nome sem pasta e sem `.md`) e `content` (o arquivo inteiro, inclusive
  propriedades e blocos de código). A busca usa `prefix: true`, `combineWith: "AND"` e
  `boost: { name: 3 }`, e devolve as notas candidatas com a pontuação. As ocorrências (posição,
  trechos, quantidade) saem de uma varredura própria, só nas notas mostradas (R8).
- **Rationale**: é a biblioteca prevista em `docs/arquitetura.md` §2. Dá prefixo, "todas as
  palavras" e relevância (BM25) em milissegundos para 5.000 notas, e tem `discard`/`replace` para
  manter o índice em dia sem reconstruir. Ela não devolve posições, por isso a varredura própria
  para o destaque.
- **Alternatives considered**: varrer o texto normalizado de todas as notas a cada consulta (sem
  relevância, e 5.000 notas grandes passam de 20 MB por tecla); FlexSearch (API mais complexa e
  sem ganho para este tamanho); índice invertido próprio (reinventar o que o MiniSearch já faz).

## R2. Maiúsculas, acentos e início de palavra

- **Decision**: o texto e a consulta passam pelo mesmo `foldText` do módulo `links` (NFD, sem
  diacríticos, minúsculas em `pt-BR`). O tokenizador do MiniSearch corta em tudo que não é letra
  nem número (`/[^\p{L}\p{N}]+/u`), então hífen, sublinhado e ponto separam partes: "api-gateway"
  vira `api` e `gateway`, e "gateway" encontra a nota. A varredura dos trechos usa a mesma regra:
  a ocorrência começa onde o caractere anterior não é letra nem número
  (`(?<![\p{L}\p{N}])termo`). Frase entre aspas: as palavras em sequência, separadas por qualquer
  espaço em branco.
- **Offsets**: a varredura roda no texto normalizado, montado caractere a caractere junto com a
  tabela "posição normalizada → posição no arquivo", porque tirar acento muda o tamanho do texto.
  Assim o destaque e o "abrir no ponto" usam a posição do arquivo, como o índice de links e a spec
  003 (`open(path, { offset })` converte para o editor).
- **Rationale**: FR-007, FR-008 e o ajuste da spec (partes de nomes técnicos contam).
- **Alternatives considered**: regex com classes de caracteres acentuados na consulta (frágil com
  ç, ñ e combinações); normalizar com NFKC (muda ligaduras e símbolos de código).

## R3. Fonte do texto e atualização do índice

- **Decision**: o texto vem do `LinkIndex.textOf(path)` (spec 003); a lista de notas, de
  `entries` do `vault.store`. Um serviço do módulo `search` observa o `vault.store`:
  - `linkIndex` trocou (vault aberto, reaberto ou reconstruído): reconstrói tudo;
  - `entries` mudou: 300 ms depois, reconcilia. Nota nova entra; nota que sumiu sai; nota cujo
    texto (`textOf`) não é o mesmo guardado é substituída (`replace`).
  A construção inicial roda em lotes de 500 notas, devolvendo o controle entre um lote e outro,
  e só começa depois que o índice de links fica pronto.
- **Rationale**: todas as mudanças (gravação do editor, alteração externa, renomear, mover,
  excluir, linkar menção) já passam por `textOf` e `entries`, na ordem certa, desde a 003 (R6 de
  lá). Reconciliar pelo resultado, sem ouvir cada tipo de evento, cobre todas e não esquece
  nenhuma. Comparar 5.000 textos é quase de graça: o índice guarda a mesma string enquanto a nota
  não muda. Lotes deixam a árvore e o editor responderem durante a construção (SC-004).
- **Alternatives considered**: ouvir `onEntryEvent` e `noteSaved` um a um (o salvamento do editor
  não emite evento, e cada novo tipo de mudança exigiria lembrar da busca); `LinkIndex` avisar
  mudanças (muda o contrato do índice sem necessidade); Web Worker (compensa só para vaults muito
  maiores; fica para depois se a medição pedir).

## R4. Tags lidas do texto

- **Decision**: tag é `#` no começo da linha ou depois de espaço, seguido de letras, números,
  `_`, `-` e `/`, com pelo menos uma letra, fora de trechos de código e de links (as mesmas regras
  de `codeRanges` e `parseLinks` do módulo `links`; `codeRanges` passa a ser exportada). Título
  Markdown (`# Título`) não é tag porque tem espaço depois do `#`. A propriedade `tags` do topo
  (lista ou texto separado por vírgula ou espaço) também conta, com ou sem `#`. Comparação por
  `foldText`; `tag:#x` casa com `x` e com `x/...`.
- **Rationale**: FR-015, FR-019, RN-TAG-001/002 e compatibilidade com o Obsidian (constituição,
  princípio II). A spec de tags vai reaproveitar a mesma leitura.
- **Alternatives considered**: esperar a spec de tags (a RN-BUSCA-001 já pede tags); aceitar `#`
  colado em palavra (`C#`, `issue#12` virariam tags).

## R5. Propriedades lidas do topo da nota

- **Decision**: `yaml` 2.9.1 (ISC, sem dependências) lê o bloco entre `---` no começo do arquivo
  (depois do BOM). Só leitura: nada é reescrito. Valores viram texto (`true`, `42`, `2026-09-30`);
  listas viram vários valores; objetos aninhados são ignorados. Bloco malformado é ignorado como
  propriedade e continua pesquisável como texto. Nome da propriedade comparado por `foldText`.
- **Rationale**: FR-017 a FR-019; constituição (Markdown com frontmatter YAML). O esquema padrão
  do `yaml` 2 (YAML 1.2 core) não converte datas, então `2026-09-30` continua sendo o texto
  escrito. A spec de propriedades vai precisar de um parser YAML completo de qualquer forma.
- **Alternatives considered**: parser próprio de `chave: valor` (quebra com listas, aspas e
  blocos multilinha); `gray-matter` (traz `js-yaml` e mais dependências para o mesmo resultado).

## R6. Consulta: palavras, frases e filtros

- **Decision**: a consulta é dividida em pedaços separados por espaço, respeitando aspas:
  - `"frase exata"` → frase;
  - `chave:valor` ou `chave:"valor com espaço"` → filtro, se `chave` (por `foldText`) for `tag`,
    `pasta` ou o nome de uma propriedade que existe em alguma nota; senão, é texto (FR-018);
  - o resto → palavras.
  Filtro sem valor é ignorado. Filtros do mesmo tipo valem juntos. Para as sugestões, o pedaço
  em que está o cursor é o que está sendo digitado.
- **Rationale**: FR-014, FR-018 e os casos `http://intranet` e `pasta:"minhas notas"`.
- **Alternatives considered**: exigir prefixo especial para propriedades (`prop:linguagem=csharp`;
  foge do exemplo da RN-BUSCA-002).

## R7. Ordem dos resultados

- **Decision**:
  1. notas em que todas as palavras e frases do texto aparecem no nome (RN-BUSCA-004);
  2. dentro de cada grupo, a pontuação do MiniSearch (que já pesa o nome 3 vezes);
  3. empate, pelo caminho.
  Busca só com filtros (sem texto): todas as notas que passam, pelo caminho.
- **Rationale**: FR-009 e CA-BUSCA-004-01; a pontuação sozinha pode pôr uma nota com muitas
  ocorrências no texto acima de uma com o termo no nome.

## R8. Trechos, contagem e abrir no ponto

- **Decision**: para cada nota mostrada, a varredura (R2) acha as ocorrências de todas as palavras
  e frases no arquivo. O resultado mostra a quantidade e até 3 trechos, na ordem do texto; o
  trecho é o mesmo da spec 003 (a linha, sem espaços nas pontas, cortada em volta da ocorrência
  com "…"). `snippetOf` sai de `features/backlinks/model` e vai para `shared/lib/snippet.ts`,
  porque agora tem dois usos. Escolher o trecho abre a nota na ocorrência; escolher a nota abre na
  primeira ocorrência, ou no começo se o termo só está no nome. A lista mostra os 100 primeiros
  resultados e um botão "Mostrar mais" acrescenta mais 100.
- **Frase exata nas candidatas**: conferida com regex sobre o texto normalizado de cada nota,
  guardado no índice e atualizado na reconciliação, sem montar a tabela de posições; a tabela só é
  montada para os resultados mostrados.
- **Rationale**: FR-010, FR-011; calcular trechos só do que aparece mantém a consulta em
  milissegundos com milhares de resultados; desenhar mil itens de uma vez custa centenas de
  milissegundos (medição da 003).
- **Alternatives considered**: lista virtualizada (nenhuma primitiva shadcn para isso; o botão
  resolve com pouco código).

## R9. Busca completa na lateral esquerda

- **Decision**: o cabeçalho da barra lateral ganha abas `Tabs` do shadcn (a instalar pela CLI),
  "Arquivos" e "Busca". A aba "Busca" mostra um `AppPanel` com:
  - o campo de busca, montado com o `Combobox` do shadcn (a instalar), com a lista de sugestões
    controlada pelo módulo (`filter={null}`, `inputValue` controlado): escolher uma sugestão troca
    só o pedaço em que está o cursor;
  - a contagem e a lista de resultados em `AppNoteList`;
  - os estados: dica dos filtros (sem consulta), esqueleto (índice em construção), vazio (sem
    resultado).
  A consulta fica numa store do módulo (`useSearchStore`), para sobreviver à troca de aba.
- **Rationale**: decisão da sessão de clarificação; `docs/arquitetura.md` §6.1 prevê `Input Group`
  e `Combobox` para a busca completa. O shadcn não tem "autocomplete" (consulta ao registro); o
  `Combobox` do Base UI 1.8.0 aceita lista controlada e texto livre.
- **Alternatives considered**: `Popover` + `Command` montados à mão sobre um `Input` (mais código de
  foco e teclado); `ToggleGroup` no lugar das abas (`Tabs` já dá a semântica de abas com painéis).

## R10. Busca rápida

- **Decision**: `CommandDialog` com `Command shouldFilter={false}`, como `LinkChoiceDialog` e
  `VaultMoveDialog`: os itens vêm de `suggestLinks` (spec 002), que já ignora maiúsculas e acentos,
  ordena por "começa com", "contém" e pasta, e indica a pasta. Enter abre, Esc fecha.
- **Rationale**: FR-002 pede a mesma ordem das sugestões de link; reaproveitar a função garante.
  A composição `app-command` (Command em Dialog com grupos e atalhos `Kbd`) nasce com a paleta de
  comandos, a primeira tela que precisa de grupos com atalhos; a busca rápida, como os outros dois
  diálogos, não precisa (COD-04).
- **Alternatives considered**: usar o índice do MiniSearch também para nomes (ordem diferente do
  autocomplete de links, o que confundiria).

## R11. Atalhos

- **Decision**: `Ctrl+P`/`Cmd+P` abre a busca rápida; `Ctrl+Shift+F`/`Cmd+Shift+F` mostra a aba
  "Busca" e põe o foco no campo; `Ctrl+Shift+E`/`Cmd+Shift+E` volta para "Arquivos" (como no VS
  Code). Os atalhos são ouvidos na fase de captura e com `preventDefault`: no WebView2, `Ctrl+P`
  abre a impressão do navegador se ninguém impedir. `Kbd` visível no botão da busca rápida e nas
  abas (LAY-06).
- **Rationale**: suposições da spec; LAY-06.
- **Alternatives considered**: `Ctrl+O` para a busca rápida (menos conhecido entre devs).

## R12. Cor do destaque

- **Decision**: o destaque da ocorrência é `bg-brand/20 text-foreground`, desenhado num lugar só:
  o `app-note-list` passa a receber o trecho em partes (`before`, `match`, `after`) e aplica a cor.
  Backlinks e busca deixam de montar o `<mark>`. O `docs/brand.md` ganha a linha "Destaque de
  ocorrência" com o contraste. Nenhum token novo: é o `brand` com opacidade.

  | Tema | Par | Contraste |
  | --- | --- | --- |
  | Claro | `#0F172A` sobre `brand` 20% em `#FFFFFF` | 14,16:1 |
  | Escuro | `#F8FAFC` sobre `brand` 20% em `#0B1220` | 13,97:1 |

- **Rationale**: FR-025 e a constituição (princípio V: "destaques e links usam `brand`"). O `brand`
  sólido só falha com texto claro por cima (3,68:1); em 20% com o texto normal, passa com folga nos
  dois temas. O hover do trecho (`ghost`) usa `muted`, então o destaque continua visível com o mouse
  em cima.
- **Alternatives considered**: `bg-accent text-accent-foreground` (usado no painel de backlinks até
  aqui; `accent` é a cor de "item selecionado" no `brand.md` e mistura dois significados, além de
  contrariar o princípio V); token novo `--highlight` amarelo (cor nova exige passar pelo `brand.md`
  e três lugares do CSS sem ganho de legibilidade); `brand` sólido com texto escuro (4,85:1, no
  limite, e pesado demais para trechos com várias ocorrências).

## R13. Metas e como medir

- **Decision**: medir no adapter de memória com 5.000 notas (Vitest) e no app desktop pelo
  protocolo de depuração do WebView2, como na 003. Busca completa com espera de 150 ms depois da
  última tecla (SC-002 conta a partir daí); busca rápida sem espera (SC-001).
- **Rationale**: SC-001 a SC-004.
