# Research: Links e Incorporação

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · Pesquisa feita em 2026-09-30

Fontes: o código da feature 001 (`src/features/links`, `src/features/editor`, `src/features/vault`,
`src/shared/vault`, `src-tauri/src/vault.rs`), o código-fonte instalado de `tauri` 2.12.0
(`src/scope/fs.rs`), `@codemirror/view` 6.43 e o registro npm de `@codemirror/autocomplete`.

## R1. Onde fica cada parte

- **Decision**:
  - `features/links/model/` (puro, sem React nem CodeMirror): resolver o destino de um link com o
    seu estado, extrair seções de uma nota, ranquear sugestões, montar o texto inserido pelo
    autocomplete, montar a árvore de incorporações com detecção de ciclo e manter o registro de
    notas excluídas.
  - `features/vault/vault.store.ts`: novas ações com efeito colateral: `followLink` (decide o que
    fazer e cria a nota do link pendente), `recreateNote`, o registro de notas excluídas e a data
    de modificação das entradas.
  - `features/editor/`: as extensões do CodeMirror (destaque dos links, seguir link,
    autocomplete e blocos de incorporação), porque o editor é a única feature que conhece o
    CodeMirror (LAY-07).
  - `app/workspace.tsx`: liga o resultado de `followLink` à interface: abre a nota no editor,
    mostra o diálogo de escolha (link ambíguo) ou a confirmação de recriar (link quebrado).
- **Rationale**: preserva o fluxo de dependências da 001 (`vault → links`, `editor → vault`,
  `editor → links`, `app → tudo`) sem ciclo. A regra de negócio fica testável sem editor, e o
  editor não decide nada sozinho.
- **Alternatives considered**: extensões do CodeMirror dentro de `features/links` (espalharia o
  CodeMirror para fora do editor e obrigaria `links` a conhecer o vault, criando ciclo);
  orquestrar tudo no editor (o editor passaria a criar notas e abrir diálogos, papel do vault e
  do `app/`).

## R2. Aparência dos estados do link e contraste

- **Decision**: o texto do link nunca usa `--brand` como cor de texto; o estado aparece no
  **sublinhado** e no **estilo do texto**, com uma dica ao passar o mouse:

  | Estado | Texto | Marca | Dica (`title`) |
  | --- | --- | --- | --- |
  | Válido | `--foreground` | sublinhado contínuo em `--brand` | "Ctrl+clique para abrir" |
  | Pendente | `--muted-foreground` | sublinhado tracejado | "Nota ainda não existe · Ctrl+clique para criar" |
  | Quebrado | `--destructive` | tachado | "Nota excluída · Ctrl+clique para ver opções" |
  | Ambíguo | `--foreground` | sublinhado ondulado em `--brand` | "Mais de uma nota com esse nome · Ctrl+clique para escolher" |
  | Arquivo | `--foreground` | sublinhado pontilhado | "Arquivo que não é nota" |

  (No macOS as dicas dizem "Cmd".)
- **Rationale**: `--brand` (#3B82F6) sobre branco tem 3,68:1 e reprova a regra de 4,5:1 do
  `brand.md` §2.3 (princípio V). Os pares usados passam: `--foreground` e `--muted-foreground`
  (7,58:1) nos dois temas, e `--destructive` (#DC2626 sobre branco 4,83:1; #EF4444 sobre #0B1220
  cerca de 5:1). A diferença entre estados está na forma do traço, não só na cor (CMP-08,
  FR-002). O azul da marca continua marcando o que é link, na linha, conforme LAY-09.
- **Alternatives considered**: `text-brand` nos links (reprova o contraste no tema claro);
  `--primary` como cor de texto (é a cor de ação, não de destaque, pela LAY-09); ícone junto ao
  link (muda a largura do texto que o usuário edita).

## R3. Seguir um link

- **Decision**: `Ctrl`+clique (`Cmd` no macOS) pelo `EditorView.domEventHandlers` (`mousedown`
  com o modificador) e `Mod-Enter` no link onde está o cursor, num `keymap` com `Prec.high`
  que devolve `false` fora de links, para não roubar o `Mod-Enter` do editor no resto do texto.
  A tecla aparece nas dicas da R2 e no `README.md` do editor.
- **Rationale**: é a escolha registrada na sessão de clarificação da spec; `Mod-Enter` é o atalho
  livre mais próximo do "abrir" em editores de código.
- **Alternatives considered**: `F12` (conflita com as ferramentas do WebView no dev); `Alt+Enter`
  (menos conhecido).

## R4. Registro de notas excluídas e dados do app no vault

- **Decision**:
  - Arquivo `.devnotes/deleted-notes.json`, JSON validado por Zod (`{ version: 1, notes: [{ path,
    deletedAt }] }`), com no máximo 5.000 entradas (sai a mais antiga).
  - Entra no registro toda nota excluída pelo app (inclusive as de uma pasta excluída) e toda nota
    que some por mudança externa com o app aberto. Sai quando volta a existir uma nota naquele
    caminho (recriada, restaurada pela lixeira, criada por outra ferramenta).
  - Gravação agrupada (500 ms) depois de cada mudança; leitura ao abrir o vault. Arquivo ausente ou
    inválido vira registro vazio, sem erro para o usuário.
  - Acesso por uma interface nova de `shared/vault`, `AppDataStore` (`read(name)`,
    `write(name, content)`), nos dois adapters. No Tauri, por dois comandos Rust,
    `vault_app_data_read` e `vault_app_data_write`, que só aceitam nomes `[a-z0-9-]+.json` e só
    gravam em `<raiz>/.devnotes/`. Nem a pasta nem o arquivo são seguidos se forem link simbólico,
    e a pasta canonizada precisa ficar dentro da raiz (mesma regra do `vault_scan` da 001), para
    um vault clonado com `.devnotes` apontando para fora não receber gravação fora dele.
- **Rationale**:
  - É o primeiro dado do app gravado no vault; a constituição (princípio II) manda que ele fique em
    `.devnotes/`, em JSON validado por Zod, e que nunca seja verdade sobre as notas: é só um
    auxílio para exibir o estado do link, apagável sem perda.
  - **Achado**: o escopo de arquivos do Tauri usa `require_literal_leading_dot = true` no Unix
    (`tauri` 2.12.0, `src/scope/fs.rs`), então a pasta liberada `raiz/**` **não** cobre
    `raiz/.devnotes/` no macOS e no Linux, embora cubra no Windows. Usar o `plugin-fs` funcionaria
    só no Windows. Os comandos Rust evitam a diferença entre sistemas e restringem a escrita a
    `.devnotes/`.
- **Alternatives considered**: `plugin-fs` com escopo extra `raiz/.devnotes/**` no Rust (funciona,
  mas expõe `.devnotes/` inteiro ao front); guardar o registro fora do vault, em `AppConfig`
  (o registro é do vault e deve ir junto se a pasta for copiada); registro só em memória
  (descartado na clarificação: precisa sobreviver ao reabrir o app).

## R5. Autocomplete

- **Decision**:
  - `@codemirror/autocomplete` 6.20.3 (versão exata, FER-02), fonte de sugestões própria ativada
    por `[[` e `![[`, `validFor` para filtrar sem reabrir a lista, `closeBrackets` desligado dentro
    do link.
  - Correspondência sem maiúsculas nem acentos (`normalize("NFD")` sem diacríticos, depois
    `nameKey`). Ordem da FR-013: nome começa com o texto → nome contém → só a pasta contém; no
    empate, `modifiedAt` mais recente. No máximo 50 itens.
  - Texto inserido: nome sozinho se o nome é único entre as notas; senão `pasta/nome` (RN-LINK-004).
    Completa até `]]`, sem duplicar `]]` já digitados.
  - `modifiedAt` vem de uma coluna nova em `VaultEntry` (data de modificação do arquivo, lida no
    `vault_scan` e no adapter de memória) e é atualizado pelo vault quando o editor grava, quando
    o app reescreve links e quando chega alteração externa.
  - A lista de sugestões é a do CodeMirror, com tema feito de tokens, dentro do `app-editor-frame`.
- **Rationale**: o componente do CodeMirror já resolve posição junto ao cursor, teclado (setas,
  Enter, Esc) e acessibilidade (`aria-activedescendant`); fica dentro da exceção LAY-07. Um
  `Command` do shadcn flutuando sobre o editor exigiria reimplementar posicionamento e foco.
- **Alternatives considered**: busca aproximada (descartada na clarificação); `Command` do shadcn
  em `Popover` ancorado no cursor (mais código, mesmo resultado); ordem alfabética no empate
  (descartada na clarificação).

## R6. Incorporação no editor

- **Decision**:
  - `StateField` do CodeMirror que cria um `Decoration.widget({ block: true, side: 1 })` depois de
    cada linha com `![[...]]` fora de código. (O CodeMirror recusa decorações de bloco vindas de
    `ViewPlugin`: "Block decorations may not be specified via plugins".)
  - O widget monta uma raiz React com o cabeçalho em shadcn (nome da nota, `Button` "Abrir" com
    ícone) e as mensagens de estado ("nota não encontrada", "incorporação circular", "seção não
    encontrada", "nota vazia", "tipo não suportado", `Skeleton` enquanto carrega). O corpo é um
    `EditorView` somente leitura com as mesmas extensões de links e de incorporação, com
    profundidade + 1 e a cadeia de notas acima dele.
  - Ciclo: se a nota já está na cadeia (inclusive a própria nota), o widget mostra o aviso de
    incorporação circular e não carrega nada. Profundidade: a partir do nível 5, só o link.
  - O conteúdo é lido do vault ao montar e relido nos eventos `external`, `rewritten`, `moved` e
    `removed` do vault para aquele caminho. `ignoreEvent()` do widget impede que cliques dentro do
    bloco movam o cursor da nota principal.
- **Rationale**: atende a clarificação (texto visível e bloco somente leitura abaixo; links do bloco
  funcionando) sem copiar conteúdo para o arquivo (FR-024). O editor aninhado reaproveita o
  destaque e o seguir link.
- **Alternatives considered**: renderizar Markdown como HTML no bloco (precisa de unified/remark,
  que chega com propriedades/tags, e perderia o destaque dos links); substituir o texto pelo
  conteúdo (descartado na clarificação).

## R7. Seções

- **Decision**: seção é um título ATX (`#` a `######`) fora de blocos de código; vai do título até o
  próximo título de nível igual ou maior. A comparação ignora maiúsculas, acentos e espaços nas
  pontas. `#^bloco` é tratado como a nota inteira (Assumptions da spec).
- **Rationale**: cobre o uso comum em notas técnicas e segue o comportamento do Obsidian.

## R8. Abrir a nota numa seção

- **Decision**: `note.store.open(path, { heading })` guarda a seção pedida; o `NoteEditor`, ao
  carregar a nota, posiciona o cursor no título e rola até ele. Seção inexistente abre no início.

## R9. Manter os estados atualizados

- **Decision**: o destaque dos links é um `ViewPlugin` que só olha as linhas visíveis e recalcula
  quando o documento muda ou quando chega um efeito `linkContextChanged`. O editor assina o
  `useVaultStore` (entradas, índice de links e registro de notas excluídas) e despacha esse efeito
  quando algum deles muda.
- **Rationale**: o custo fica proporcional à tela, não ao tamanho da nota (SC-006 em até 2 s vem do
  observador da 001, que já entrega em menos de 1 s).

## R10. Testes

- **Decision**:
  - Vitest para o modelo puro (estado do link, seções, ranking, árvore de incorporação, registro),
    para a store (`followLink`, registro, `modifiedAt`) e para o editor em jsdom (classes do
    destaque, bloco de incorporação e sugestões abertas por `startCompletion`). Seguir link nos
    testes do jsdom é feito pelo `Mod-Enter`, porque o jsdom não tem layout e o CodeMirror não
    acha a posição de um clique.
  - Playwright no `pnpm dev:mock`: `Ctrl`+clique em link pendente cria a nota, autocomplete com nome
    repetido e incorporação que acompanha a original.
  - `cargo test` para os comandos de dados do app (nome inválido, caminho fora de `.devnotes/`).
  - Contrato de `shared/vault`: casos novos para `modifiedAt` e `AppDataStore`.

## R11. Dependências

- **Decision**: só `@codemirror/autocomplete` 6.20.3 entra. Todo o resto já está no projeto.

## Sem pendências

Nenhum item ficou como NEEDS CLARIFICATION. O único ponto de sistema operacional (R4) foi resolvido
lendo o código do Tauri instalado.
