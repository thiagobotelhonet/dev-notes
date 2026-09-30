# Research: Backlinks

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · Pesquisa feita em 2026-09-30

Fontes: o código das specs 001 e 002 (`src/features/links`, `src/features/vault`,
`src/features/editor`, `src/shared/components`), o registro do shadcn consultado pela CLI (a
mesma fonte do MCP do `.mcp.json`), as medições da validação no app desktop (quickstart da 002
§5 e §6) e um teste de desempenho da busca de menções.

## R1. Onde fica cada parte

- **Decision**:
  - `features/links/model/` (puro): a regra de **menção** (onde o nome aparece como palavra
    inteira, fora de link e de código) e o **texto do link** que substitui a menção. É regra de
    link, e o `vault` precisa dela para conferir antes de gravar.
  - `features/links/model/links.index.ts`: o índice passa a guardar o texto de cada nota
    (`textOf(path)`), que ele já recebe em `update`.
  - `features/vault/vault.store.ts`: a ação que grava, `linkMention`, com as mesmas garantias de
    `renameEntry` (gravar a nota aberta antes, conferir o arquivo, registrar a escrita, avisar o
    editor).
  - `features/backlinks/` (módulo novo): o painel, o agrupamento por nota e o trecho de cada
    ocorrência. Não grava nada e não conhece o editor: recebe `onOpen(path, offset)` do `app/`.
  - `features/editor/note.store.ts`: `open(path, { offset })`, ao lado do `{ heading }` da 002.
  - `shared/components/`: `app-panel` (LAY-03), `app-note-list` (LAY-02), o lado direito do
    `app-shell` (LAY-01) e ações no cabeçalho do `app-editor-frame`.
  - `app/workspace.tsx`: mostra e esconde o painel, liga `onOpen` ao editor.
- **Rationale**: segue o fluxo de dependências das specs anteriores (`backlinks → vault, links`;
  `vault → links`; `editor → vault, links`; `app → tudo`), sem ciclo. A `arquitetura.md` §5 já
  prevê o módulo `backlinks` e o §9 liga RN-BACK-* a ele.
- **Alternatives considered**: a regra de menção dentro de `backlinks` (o `vault` teria de
  importar `backlinks` para conferir antes de gravar, e `backlinks` já importa `vault`: ciclo);
  gravar a menção dentro de `backlinks` com `shared/vault` direto (perderia o evento `rewritten`,
  o `onBeforeMutate` e a atualização do índice que o `vault.store` faz).

## R2. Texto das notas em memória

- **Decision**: o `LinkIndex` guarda o texto que já recebe em `update(path, text)` e expõe
  `textOf(path)`. As menções são procuradas nesse texto, sem ler o disco ao abrir uma nota.
- **Rationale**:
  - Ler as 5.000 notas a cada nota aberta custa ~0,6 s no Windows, e até ~20 s logo depois de
    mudanças em massa com antivírus (validação da 002); a SC-001 pede as menções em até 2 s.
  - O índice já é atualizado em todos os pontos em que o texto muda (abrir o vault, gravar,
    reescrever, alteração externa), então o texto guardado acompanha o disco sem código novo.
  - Custo de memória: 5.000 notas de 2 KB ocupam ~10 MB; é índice descartável, reconstruído ao
    abrir o vault (constituição, princípio II).
- **Alternatives considered**: um cache de texto separado no `vault.store` (duplicaria os pontos de
  atualização do índice); índice de palavras (desnecessário: ver R3); ler sob demanda (lento, ver
  acima).

## R3. Regra da menção

- **Decision**:
  - Nome considerado: o nome da nota, sem pasta e sem `.md`, em NFC; menos de 3 caracteres não
    gera menção (clarificação da spec).
  - Busca por expressão regular Unicode, sem diferenciar maiúsculas (`iu`), com o nome escapado e
    as fronteiras `(?<![\p{L}\p{N}_-])` e `(?![\p{L}\p{N}_-])`: letras (com e sem acento), números,
    hífen e sublinhado fazem parte da palavra. Os acentos não são ignorados.
  - Descartadas as ocorrências dentro de trechos de código (a mesma regra do parser de links) e
    dentro de qualquer `[[...]]` ou `![[...]]`, inclusive apelido.
  - A própria nota não entra.
- **Rationale**: RN-BACK-003 e os casos da spec ("rapidamente", "api-gateway", "api_v2", "(api)").
  Acentos contam porque a menção vira link, e o link sem acento não apontaria para a nota (a
  resolução usa `nameKey`, que mantém acentos).
- **Medição**: 5.000 notas de 2 KB (10 MB de texto), no Node: 4 a 34 ms por nome, mesmo com 137
  mil ocorrências. Não precisa de índice de palavras nem de trabalho em segundo plano.
- **Alternatives considered**: `\b` do JavaScript (não entende letras acentuadas); ignorar acentos
  (link resultante não resolveria); tamanho mínimo diferente (decidido na clarificação).

## R4. Texto do link inserido

- **Decision**: se o nome da nota é único no vault, a menção vira `[[texto]]` com o texto como
  estava escrito ("Deploy" → `[[Deploy]]`, que resolve pela `nameKey`); se é repetido, vira
  `[[pasta/nome|texto]]` (sem `.md`), para apontar para a nota do painel e o texto lido não mudar.
- **Rationale**: FR-012 e RN-LINK-004; o apelido preserva a leitura, e o link nunca sai ambíguo.
- **Alternatives considered**: sempre `pasta/nome|texto` (polui os links de nomes únicos); trocar
  o texto pelo nome da nota (muda o que o usuário escreveu).

## R5. Gravar a menção sem perder nada

- **Decision**: `linkMention({ path, start, end, text }, target)` no `vault.store`:
  1. `onBeforeMutate([path])` (a nota que menciona grava antes, se estiver aberta);
  2. lê o arquivo e compara com o texto do índice e com o trecho esperado; se algo mudou, não
     grava, atualiza o índice com o que leu e devolve `changed`;
  3. troca só o intervalo da menção no texto lido, com BOM e quebras de linha preservadas (as
     posições são do texto cru, o mesmo que o índice guarda);
  4. grava por `storage.writeText` (ledger), atualiza o índice e a data da entrada e emite
     `rewritten` (o editor e os blocos de incorporação releem).
- **Rationale**: FR-013 a FR-016 e o princípio II ("nunca sobrescrever conteúdo desconhecido").
  Comparar o arquivo inteiro com o texto indexado é mais simples e mais seguro que comparar só o
  trecho.
- **Alternatives considered**: gravar pelo editor (a nota que menciona não está aberta); procurar
  a menção de novo se o arquivo mudou (poderia linkar outra ocorrência sem o usuário ver).

## R6. Manter o painel em dia

- **Decision**: o painel calcula na hora ao abrir a nota e, depois, assina `entries` e
  `linkIndex` do `vault.store` e recalcula com atraso de 300 ms. Quase toda mudança de texto
  conhecida pelo app já troca `entries` depois de atualizar o índice (gravar, reescrever, criar
  pelo app, alteração externa de nota existente). A exceção é a nota **criada** por fora: `entries`
  muda pelo `refresh` de 100 ms, que pode terminar antes da leitura do conteúdo (lenta com
  antivírus); por isso `onExternal` passa a atualizar `entries` com o próprio evento, depois do
  índice (T011): tira as removidas, acrescenta as criadas e marca as alteradas. Isso também evita
  que o registro de notas excluídas da 002 seja limpo com uma lista desatualizada (achado ao
  implementar: uma nota renomeada por fora saía do registro). Nenhum evento novo é preciso.
- **Rationale**: FR-005 e SC-003 (2 s). O cálculo (links por `linksTo` + menções) leva dezenas de
  milissegundos com 5.000 notas; o atraso evita recalcular a cada gravação automática.

## R7. Painel, atalho e peças shadcn

- **Decision**:
  - `app-shell` ganha o lado direito opcional (`aside`), num `ResizablePanel` (LAY-05).
  - `app-panel`: cabeçalho com título e ações, `ScrollArea` e estado vazio com `Empty` (LAY-03).
  - `app-note-list`: `ItemGroup` de `Item` (ícone em `ItemMedia`, nome e pasta em `ItemContent`,
    trechos clicáveis, ação em `ItemActions`) (LAY-02).
  - Seção de menções com `Collapsible`, recolhida por padrão, com a contagem no gatilho.
  - Mostrar e esconder: botão no cabeçalho do editor (`Tooltip` com `Kbd`) e o atalho
    `Ctrl+Shift+B` (`Cmd+Shift+B` no macOS); vale durante a sessão, aberto por padrão.
  - Instalar pela CLI do shadcn (CMP-01): `item` e `scroll-area`. `collapsible`, `button`,
    `tooltip`, `kbd` e `empty` já estão instalados.
- **Rationale**: a `arquitetura.md` §6.1 já define o painel de backlinks com `Item`, `Collapsible`
  e `Button`. `Ctrl+B` é o atalho do `Sidebar` do shadcn para a barra esquerda; com `Shift` a
  tecla chega como "B" e não conflita; o CodeMirror não usa `Mod-Shift-b`.
- **Alternatives considered**: `Sheet` flutuante (tapa o texto; o painel é para consulta
  enquanto se escreve); lista própria com `<ul>` (CMP-02).

## R8. Abrir no ponto da ocorrência

- **Decision**: `note.store.open(path, { offset })`; o `NoteEditor` põe o cursor na posição e
  rola até ela, pelo mesmo caminho do `{ heading }` da 002 (um único pedido de revelação).
- **Rationale**: FR-004 e FR-010; reaproveita o que existe.

## R9. Testes

- **Decision**: Vitest para a regra de menção e o texto do link (`links`), o agrupamento e o
  trecho (`backlinks`), `linkMention` no `vault.store` (inclusive arquivo alterado por fora e BOM),
  o painel em jsdom e a integração no `workspace`; Playwright no `dev:mock` para a jornada "ver
  backlinks e linkar uma menção"; medição de 5.000 notas no adapter de memória.

## R10. Dependências

- **Decision**: nenhuma dependência npm nova. Só os componentes `item` e `scroll-area` do shadcn.

## Sem pendências

Nenhum item ficou como NEEDS CLARIFICATION.
