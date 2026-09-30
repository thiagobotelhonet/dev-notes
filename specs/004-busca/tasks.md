---

description: "Lista de tarefas da feature 004 — Busca"
---

# Tasks: Busca

**Input**: Design documents from `/specs/004-busca/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/modules.md](./contracts/modules.md),
[contracts/ui.md](./contracts/ui.md), [quickstart.md](./quickstart.md)

**Tests**: obrigatórios. A constituição exige que todo critério `CA-*` vire teste Vitest em
`features/*/tests/` sobre o adapter em memória. Os testes vêm antes da implementação: escreva-os,
confirme que falham e só então implemente.

**Organization**: tarefas agrupadas por história de usuário, para que cada uma possa ser
implementada e testada de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história da spec (US1..US4)
- Todo caminho é relativo à raiz do repositório

## Regras que valem para toda tarefa

- Trabalho direto na `main`; commit só quando o usuário pedir, sem linha `Co-Authored-By`.
- Nomes em minúsculas com hífen ou `assunto.tipo.ts` (NOM-01, NOM-04); exportação nomeada (NOM-02);
  `@/` fora do módulo, relativo dentro (NOM-03), inclusive nos testes.
- Só crie o arquivo quando ele for usado (NOM-05); o `index.ts` exporta só o que outro módulo usa
  (NOM-06).
- Texto para o usuário em português (IDI-01); código e comentários em inglês, uma linha, com o porquê
  (IDI-02, COD-01, COD-02).
- UI só com shadcn instalado pela CLI (CMP-01), composição por `render` (CMP-03), sem cor pronta nem
  medida entre colchetes (COR-01, COR-03); textos exatamente como em [contracts/ui.md](./contracts/ui.md).
- `features/search` nunca importa `features/editor` nem `features/backlinks`; lê o vault só por
  `@/features/vault` e usa `@/features/links` (contracts/modules.md).
- Buscar nunca grava arquivo (FR-022).
- Nome de teste cita o ID do critério, ex.: `it("CA-BUSCA-004-01 — prioridade do nome", ...)`.
- Interação em teste de componente com `user-event` (TST-04).
- Consulte a documentação da versão instalada antes de usar `minisearch`, `yaml` e o `Combobox` do
  Base UI 1.8.0 (`node_modules/<pacote>/package.json` e os `.d.ts`).
- Rode `pnpm verify` ao fim de cada fase.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependências, peças shadcn e o registro das regras e da cor nos documentos

- [X] T001 [P] Instalar `pnpm add --save-exact minisearch@7.2.0 yaml@2.9.1` (research R1, R5). Conferir nos `.d.ts` instalados que o MiniSearch tem `discard`, `replace`, `has`, `search` com `prefix`, `combineWith` e `boost`, e anotar diferenças no research. `pnpm build` continua verde (o build confere que nada de rede entrou)
- [X] T002 [P] Instalar pela CLI do shadcn, depois de consultar o registro (LAY-08): `pnpm exec shadcn add tabs combobox`, gerando `src/shared/components/ui/tabs.tsx` e `src/shared/components/ui/combobox.tsx` (research R9). Rodar antes com `--dry-run`/`--diff`; se a CLI pedir para sobrescrever um arquivo existente de `ui/`, não responder no automático: conferir o diff e só usar `--overwrite` se for idêntico. Conferir `git diff src/shared/components/ui`
- [X] T003 [P] Documentos: em `docs/regras-de-negocio.md` §9, os cenários [novo] da spec no formato das specs anteriores (`(Tipo · RN · spec 004)`): CA-BUSCA-001-01 a 06, CA-BUSCA-002-02 a 07, CA-BUSCA-005-01 a 05, CA-BUSCA-006-01 a 04, e a linha de RN-BUSCA-* no §11; em `docs/brand.md`, a linha "Destaque de ocorrência" (`bg-brand/20 text-foreground`, contraste 14,16:1 no claro e 13,97:1 no escuro, e por que não `accent` nem `brand` sólido) (research R12); em `CHANGELOG.md`, seção "Não lançado", a linha "Feature 004 — Busca (`specs/004-busca/`)"

**Checkpoint**: `pnpm verify` verde, sem mudança de comportamento

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: trecho compartilhado, destaque num lugar só, funções de `links` exportadas e o vault de demonstração

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

- [X] T004 [P] Mover `snippetOf` e o tipo `Snippet` de `src/features/backlinks/model/backlinks.list.ts` para `src/shared/lib/snippet.ts`, sem mudar o comportamento (contracts/modules.md); mover os casos de `snippetOf` de `src/features/backlinks/tests/backlinks-list.test.ts` para `src/shared/lib/tests/snippet.test.ts`; `backlinks.list.ts` passa a importar de `@/shared/lib/snippet`
- [X] T005 Em `src/shared/components/app-note-list.tsx`: `NoteListSnippet.text: Snippet` no lugar de `content`, com a lista desenhando `before`, a ocorrência em `<mark className="rounded-sm bg-brand/20 px-0.5 text-foreground">` e `after` (FR-025); `NoteListItem.meta?: string` (texto `text-muted-foreground text-xs` ao lado da pasta) e `NoteListItem.onOpen?()` (o cabeçalho do item vira um `Button variant="ghost"`; o nome acessível é o próprio conteúdo, nome e pasta, que distingue notas de mesmo nome — "Abrir {title}" repetiria o nome). Ajustar `src/features/backlinks/components/backlinks-panel.tsx` para mandar `text: occurrence.snippet` e tirar o `<mark>` de lá. **Esperado**: os testes de backlinks continuam verdes. Depende de T004
- [X] T006 [P] Em `src/features/links/index.ts`, exportar `codeRanges` (de `model/links.parser.ts`) e `foldText` (de `model/links.text.ts`), sem mudar o comportamento; documentar em `src/features/links/README.md`
- [X] T007 [P] Em `src/mocks/demo-vault.ts`, acrescentar o vault do quickstart §4 que ainda não existe: `Configuração.md` ("Configuração do proxy"), bloco de código com `kubectl rollout restart` em `runbook.md`, `#backend` em `infra.md` (numa linha nova, sem mexer nos links existentes), e a pasta `snippets/` com `deploy-api.md` (`#backend`, "deploy", propriedade `linguagem: csharp`), `hello-py.md` (`linguagem: python`, `tags: [backend/api]`) e `dotnet/build.md` ("deploy", `linguagem: csharp`). Rodar `pnpm test` e `PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e` e ajustar contagens que mudarem nos testes existentes, com comentário do motivo

**Checkpoint**: `pnpm verify` verde; backlinks com a mesma aparência

---

## Phase 3: User Story 1 - Abrir uma nota pelo nome (Priority: P1) 🎯 MVP

**Goal**: `Ctrl+P`, parte do nome, Enter: a nota abre, só pelo teclado (RN-BUSCA-003, 005)

**Independent Test**: num vault com `deploy`, `infra`, `backend/api` e `frontend/api`, abrir a busca rápida pelo atalho, digitar parte de cada nome e abrir cada nota só com o teclado

### Tests for User Story 1 ⚠️

- [X] T008 [P] [US1] Escrever `src/features/search/tests/quick-search.test.tsx` renderizando `QuickSearchDialog` aberto sobre o adapter de memória: **CA-BUSCA-005-01** (`depl` + Enter → `onOpen("deploy.md")`); **CA-BUSCA-005-02** (`api` mostra as duas, cada uma com a pasta); **CA-BUSCA-005-03** (`configuracao` acha `Configuração`); **CA-BUSCA-005-04** (setas e Enter abrem a escolhida; Esc chama `onOpenChange(false)` sem `onOpen`); **CA-BUSCA-005-05** ("Nenhuma nota com esse nome."); sem texto, "Digite parte do nome da nota."; canvas não aparece; `backend` lista as notas de `backend/` depois das que têm "backend" no nome (FR-002, grupo da pasta)
- [X] T009 [P] [US1] Escrever `src/app/tests/workspace-search.test.tsx` (seção busca rápida): `Ctrl+P` abre o diálogo e o evento tem `defaultPrevented` (research R11); o botão "Abrir nota pelo nome" abre o diálogo e o `Tooltip` mostra o `Kbd`; escolher uma nota a abre no editor; com edição pendente na nota atual, ela é gravada antes (spec 001)

### Implementation for User Story 1

- [X] T010 [US1] Criar `src/features/search/components/quick-search-dialog.tsx` pelo contracts/ui.md "Busca rápida": `CommandDialog` com `Command shouldFilter={false}`, itens de `suggestLinks(texto, entries)` (`@/features/links`, research R10), no máximo 50, ícone `FileText`, pasta ou "raiz" à direita; `src/features/search/index.ts` exportando `QuickSearchDialog`; `src/features/search/README.md` com o contrato e RN-BUSCA-005 (parte rápida). **Esperado**: T008 passa
- [X] T011 [US1] Em `src/app/workspace.tsx`: estado do diálogo; botão `Button variant="ghost" size="icon-sm"` "Abrir nota pelo nome" (ícone `FileSearch`, `Tooltip` com `Kbd` `Ctrl+P`/`⌘P`) no cabeçalho da barra lateral; ouvir `Ctrl/Cmd+P` na fase de captura com `preventDefault`; `onOpen` → `openNote`. **Esperado**: T009 (busca rápida) passa

**Checkpoint**: T008–T009 verdes; passos 1 a 3 do quickstart §4 ok

---

## Phase 4: User Story 2 - Encontrar notas pelo conteúdo (Priority: P1)

**Goal**: aba "Busca" com nome, conteúdo e código, sem maiúsculas nem acentos, nome antes, trechos destacados que abrem no ponto (RN-BUSCA-001, 003, 004, 005)

**Independent Test**: com `deploy`, `infra` (cita "deploy"), `Configuração` e `runbook` (código com `kubectl rollout`), buscar `deploy`, `configuracao` e `rollout` e conferir quem aparece, em que ordem e com que trechos

### Tests for User Story 2 ⚠️

- [X] T012 [P] [US2] Escrever `src/features/search/tests/search-query.test.ts`: palavras normalizadas por `foldText`; `"frase exata"` vira frase; aspas sem fechar valem até o fim; espaços extras ignorados; consulta vazia; `http://intranet` é texto (nesta história, todo `chave:valor` é texto)
- [X] T013 [P] [US2] Escrever `src/features/search/tests/search-occurrences.test.ts`: posições no arquivo com acento (`Configuração` buscada como `configuracao`), BOM e CRLF; início de palavra (`api` não casa em "rapidamente"; casa em "api-gateway" e "(api)"; `gateway` casa em "api-gateway"; `v2` em "api_v2"); frase com quebra de linha ou vários espaços no meio; contagem total e os 3 primeiros trechos na ordem do texto, com `snippetOf`
- [X] T014 [P] [US2] Escrever `src/features/search/tests/search-index.test.ts` sobre o `vault.store` com o adapter de memória: **CA-BUSCA-003-01**; **CA-BUSCA-004-01**; **CA-BUSCA-001-01** (código); **CA-BUSCA-001-02** (várias palavras); **CA-BUSCA-001-03** (frase exata); **CA-BUSCA-001-05** (`rapidamente`); empate ordenado pelo caminho; prefixo (`depl`); reconciliação: nota criada, alterada e excluída por `simulateExternal`, gravada por `noteSaved`, renomeada e movida por `renameEntry`/`moveEntry` e reescrita por `linkMention` aparecem no resultado em até 2 s (`expect.poll`); troca de vault reconstrói; canvas e `.devnotes/` fora (FR-024); nada gravado (`memory.files()` igual)
- [X] T015 [P] [US2] Escrever `src/features/search/tests/search-panel.test.tsx`: estados do contracts/ui.md (dica sem consulta, esqueleto com "Preparando a busca…", "Nenhuma nota corresponde à busca."); contagem "1 nota"/"{n} notas"; meta "{n} ocorrências" (ausente quando só o nome casa); até 3 trechos; "Mostrar mais" com 120 notas (100 → 120); **CA-BUSCA-001-04** (escolher um trecho chama `onOpen(path, offset)` na ocorrência); escolher a nota chama `onOpen(path, primeiraOcorrência)` ou `onOpen(path)` quando só o nome casa; **CA-BUSCA-001-06** (nota que passa a ter o termo entra sem nova busca); a consulta continua depois de desmontar e montar o painel
- [X] T016 [P] [US2] Em `src/app/tests/workspace-search.test.tsx`, seção busca completa: abas "Arquivos" e "Busca" com `Tooltip` e `Kbd`; `Ctrl+Shift+F` mostra a aba "Busca" com foco no campo; `Ctrl+Shift+E` volta à árvore; escolher um trecho abre a nota no editor com o cursor na ocorrência

### Implementation for User Story 2

- [X] T017 [US2] Criar `src/features/search/model/search.query.ts` com `parseQuery(texto)` → `SearchQuery` (`words`, `phrases`, e `tags`, `folders`, `properties` vazios nesta história), pelo data-model.md e research R6. **Esperado**: T012 passa
- [X] T018 [US2] Criar `src/features/search/model/search.occurrences.ts`: normalização caractere a caractere com a tabela de posições (research R2), regex de início de palavra `(?<![\p{L}\p{N}])`, frases com `\s+` entre as palavras, contagem e até 3 `SearchOccurrence` com `snippetOf` de `@/shared/lib/snippet`. **Esperado**: T013 passa
- [X] T019 [US2] Criar `src/features/search/model/search.index.ts`: `createSearchIndex()` sobre o MiniSearch (campos `name` e `content`, tokenizador `/[^\p{L}\p{N}]+/u`, `processTerm` com `foldText`, busca com `prefix: true`, `combineWith: "AND"`, `boost: { name: 3 }`); só entram `entries` do tipo `note` fora de pasta oculta, mesmo que o índice de links tenha o texto de canvas (FR-024); `build(notes)` em lotes de 500 com `setTimeout(0)` entre eles; `reconcile(entries, textOf)` (entra, sai, `replace` quando o texto mudou); `search(query)` com a ordem do research R7 (`inName`, `score`, `path`), devolvendo `SearchResult` sem ocorrências. A frase exata é conferida com regex sobre o texto normalizado guardado por nota (atualizado na reconciliação), sem a tabela de posições, que fica só para os resultados mostrados (T021), para manter a SC-002 com milhares de candidatas
- [X] T020 [US2] Criar `src/features/search/search.store.ts` (Zustand): `query`, `limit` (100; +100; volta a 100 quando a consulta muda), `status` (`building`/`ready`), o índice do vault aberto; observa `useVaultStore` (`@/features/vault`): `linkIndex` novo → reconstrói; `entries` mudou → reconcilia 300 ms depois (research R3). **Esperado**: T014 passa
- [X] T021 [US2] Criar `src/features/search/components/search-panel.tsx` pelo contracts/ui.md "Busca completa": `AppPanel` "Busca"; campo `Combobox` (ainda sem sugestões) com "Buscar nas notas" e "Limpar busca"; consulta com espera de 150 ms; contagem; `AppNoteList` com `meta`, `onOpen` do item e trechos (ocorrências calculadas só para os resultados mostrados); "Mostrar mais"; os três estados; `focusSearchInput()`. Exportar `SearchPanel` e `focusSearchInput` no `index.ts`. **Esperado**: T015 passa
- [X] T022 [US2] Em `src/app/workspace.tsx`: `Tabs` variante `line` no cabeçalho da barra lateral ("Arquivos" com `FolderTree`, "Busca" com `Search`, cada uma com `Tooltip` e `Kbd`), abaixo do nome do vault; aba "Busca" com o `SearchPanel`; `Ctrl/Cmd+Shift+F` (aba e foco) e `Ctrl/Cmd+Shift+E` na captura com `preventDefault`; `onOpen` → `openNoteAt(path, offset === undefined ? undefined : { offset })`. **Esperado**: T016 passa
- [X] T023 [US2] Completar `src/features/search/README.md` (RN-BUSCA-001, 003, 004, 005: campos, início de palavra, frases, ordem, trechos, atualização, "nunca grava")

**Checkpoint**: T012–T016 verdes; passos 4 a 7, 12, 13 e 14 do quickstart §4 ok

---

## Phase 5: User Story 3 - Filtrar por tag, pasta e propriedade (Priority: P2)

**Goal**: `tag:`, `pasta:` e `<propriedade>:` combinados com o texto (RN-BUSCA-001, 002; RN-TAG-001, 002)

**Independent Test**: num vault com notas em `snippets/` e fora, com `#backend` e `#backend/api`, e com `linguagem: csharp` e `python`, combinar filtros e conferir quem aparece

### Tests for User Story 3 ⚠️

- [X] T024 [P] [US3] Escrever `src/features/search/tests/search-metadata.test.ts`: tag no começo da linha e depois de espaço; `#123`, `C#`, `issue#12` e `# Título` não são tag; tag em código (cerca e inline) e dentro de link não conta; hierarquia `#backend/api`; propriedade `tags` como lista e como texto, com e sem `#`; propriedades texto, número, sim/não, data (continua como escrita), lista; objeto aninhado ignorado; bloco malformado ignorado sem erro; BOM e CRLF antes do bloco; nada fora do topo vira propriedade
- [X] T025 [P] [US3] Acrescentar a `src/features/search/tests/search-query.test.ts`: `tag:#backend` e `tag:backend` iguais; `pasta:snippets/` sem barra; `linguagem:csharp` vira filtro só se `linguagem` for propriedade conhecida; `pasta:"minhas notas"`; filtro sem valor ignorado; filtros repetidos acumulam; **CA-BUSCA-002-07** (`http://intranet` continua texto quando não há propriedade `http`)
- [X] T026 [P] [US3] Acrescentar a `src/features/search/tests/search-index.test.ts`: **CA-BUSCA-002-01**; **CA-BUSCA-002-02** (tag mãe inclui filhas; filha não inclui mãe); **CA-BUSCA-002-03**; **CA-BUSCA-002-04** (só filtros, ordem pelo caminho); **CA-BUSCA-002-05** (tag só em código não conta, mas o texto `backend` acha); **CA-BUSCA-002-06** (subpastas); filtros sem diferenciar maiúsculas nem acentos; propriedade com lista casa com um item; filtros repetidos exigem todos (`tag:#backend tag:#urgente` só acha a nota com as duas); propriedade como texto, sem filtro (`csharp` acha `deploy-api`; `linguagem` acha as notas com essa propriedade, FR-006); tag acrescentada por fora entra no filtro depois da reconciliação

### Implementation for User Story 3

- [X] T027 [US3] Criar `src/features/search/model/search.metadata.ts`: `readMetadata(path, texto)` → `NoteMetadata` (tags pelo research R4, com `codeRanges` e `parseLinks` de `@/features/links`; propriedades pelo research R5, com `parse` do `yaml` só do bloco do topo) e `mergeMetadata` → `SearchMetadata` (data-model.md). **Esperado**: T024 passa
- [X] T028 [US3] Estender `search.query.ts` (filtros, pelo research R6, recebendo as chaves de propriedade conhecidas) e `search.index.ts` (metadados por nota mantidos na reconciliação; filtro de tag com filhas, pasta com subpastas, propriedade por valor; consulta só de filtros ordenada pelo caminho). **Esperado**: T025 e T026 passam
- [X] T029 [US3] Em `src/features/search/README.md`, a seção "Filtros" (RN-BUSCA-002, RN-TAG-001/002, o que é tag, de onde vêm as propriedades, texto com dois-pontos)

**Checkpoint**: T024–T026 verdes; passos 8 a 10 do quickstart §4 ok

---

## Phase 6: User Story 4 - Receber sugestões ao digitar um filtro (Priority: P3)

**Goal**: valores existentes sugeridos em `tag:`, `pasta:` e propriedades, escolhidos pelo teclado (RN-BUSCA-006)

**Independent Test**: no vault da US3, digitar o começo de cada filtro e escolher uma sugestão só com o teclado

### Tests for User Story 4 ⚠️

- [X] T030 [P] [US4] Escrever `src/features/search/tests/search-suggestions.test.ts`: **CA-BUSCA-006-01** (`tag:#ba` → `#backend`, `#backend/api`); **CA-BUSCA-006-02** (`pasta:sn` → `snippets`, `snippets/dotnet`); **CA-BUSCA-006-03** (`linguagem:` → `csharp`, `python`); sem diferenciar maiúsculas nem acentos; só o pedaço em que está o cursor; sem sugestões fora de um filtro
- [X] T031 [P] [US4] Acrescentar a `src/features/search/tests/search-panel.test.tsx`: **CA-BUSCA-006-04** (setas e Enter escolhem `#backend`; o campo vira `tag:#backend` e o resultado muda); Tab também escolhe; Esc fecha só a lista e mantém a consulta

### Implementation for User Story 4

- [X] T032 [US4] Criar `src/features/search/model/search.suggestions.ts`: `suggestFilterValues(texto, cursor, metadata, folders)` → o pedaço atual e os valores que casam (data-model.md `SearchMetadata`). **Esperado**: T030 passa
- [X] T033 [US4] Em `src/features/search/components/search-panel.tsx`, as sugestões no `Combobox` (`items` controlados, `filter={null}`, `inputValue` controlado; escolher troca só o pedaço do cursor e refaz a busca), pelo contracts/ui.md. **Esperado**: T031 passa; README com RN-BUSCA-006

**Checkpoint**: T030–T031 verdes; passo 11 do quickstart §4 ok; todas as histórias funcionam

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: jornada no navegador, desempenho, documentação, revisão e app desktop

- [X] T034 [P] Escrever `e2e/search.spec.ts` (Playwright no `dev:mock`) com a jornada do quickstart §3 (depois da T038, só o caso do `Ctrl+P`, TST-07; o resto ficou no Vitest): `Ctrl+P`, `depl`, Enter abre `deploy`; `Ctrl+Shift+F`, `deploy tag:#backend` mostra só as notas com a tag; escolher um trecho abre a nota; `Ctrl+Shift+E` volta à árvore
- [X] T035 [P] Escrever `src/features/search/tests/search-performance.test.ts` com 5.000 notas geradas no teste: construir o índice em menos de 5 s (SC-004); `suggestLinks` por tecla em menos de 0,3 s (SC-001); `search` de texto, de frase e com filtros em menos de 0,5 s (SC-002); outros módulos só pelos `index.ts`
- [X] T036 [P] Atualizar `docs/arquitetura.md`: §5 com o módulo `search` implementado; §6.1 com `Tabs` e `Combobox` na barra lateral; §6.2 dizendo que a busca rápida usa `CommandDialog` direto e que `app-command` nasce com a paleta (research R10), e o `app-note-list` com trecho em partes e destaque; §9 com RN-BUSCA-* em `search`
- [X] T037 Validar no app desktop pelo protocolo de depuração do WebView2, como na 003: acrescentar `vault-busca` ao `gerar-vaults.mjs` (fora do repositório, quickstart §4); rodar os 14 passos da §4 e medir as metas da §5 no vault sintético depois da primeira leitura (antivírus), inclusive que `Ctrl+P` não abre a impressão; registrar números, máquina e resultados no fim de `specs/004-busca/quickstart.md`
- [X] T038 Rodar a skill `app-review-standards` sobre todas as mudanças e corrigir o que for "Bloqueia" e "Deveria corrigir"
- [ ] T039 Rodar `pnpm verify` e `pnpm test:e2e`; roteiro manual da §4 no macOS e no Linux quando houver máquina (2026-09-30: `verify` com 444 testes e `test:e2e` com 13 jornadas verdes; roteiro da §4 repetido no Windows depois da revisão, 14 de 14; macOS e Linux pendentes)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup e **bloqueia as histórias**.
- **US1 (Phase 3)**: depende da Foundational.
- **US2 (Phase 4)**: depende da Foundational (T002 para o `Combobox` e as `Tabs`; T004 e T005 para os trechos).
- **US3 (Phase 5)**: depende da US2 (consulta e índice).
- **US4 (Phase 6)**: depende da US3 (metadados).
- **Polish (Phase 7)**: depende das histórias desejadas.

### User Story Dependencies

```text
Setup → Foundational → US1
                     → US2 → US3 → US4
```

- **US1 (P1)**: nenhuma outra história; pode andar junto com a US2.
- **US2 (P1)**: nenhuma outra história.
- **US3 (P2)**: US2.
- **US4 (P3)**: US3.

### Within Each User Story

- Testes escritos e falhando antes da implementação.
- Modelo puro antes do componente; componente antes da integração no `workspace`.
- A história fica pronta, com `pnpm verify` verde, antes da próxima.

### Arquivos disputados

- `src/app/workspace.tsx`: T011, T022, nessa ordem.
- `src/app/tests/workspace-search.test.tsx`: T009, T016; quem vier depois só acrescenta.
- `src/features/search/model/search.query.ts`: T017, T028.
- `src/features/search/model/search.index.ts`: T019, T028.
- `src/features/search/components/search-panel.tsx`: T021, T033.
- `src/features/search/tests/search-query.test.ts`, `search-index.test.ts`, `search-panel.test.tsx`: casos de mais de uma história; quem vier depois só acrescenta.
- `src/features/search/README.md`: T010, T023, T029, T033.
- `src/shared/components/app-note-list.tsx` e `backlinks-panel.tsx`: só T005.

### Parallel Opportunities

- Setup: T001, T002 e T003 juntos.
- Foundational: T004, T006 e T007 juntos; T005 depois do T004.
- US1 e US2 em paralelo depois da Foundational, exceto `workspace.tsx` (T011 antes do T022).
- US2: os testes T012–T016 juntos.
- US3: os testes T024–T026 juntos.
- Polish: T034, T035 e T036 juntos.

---

## Parallel Example: Foundational

```bash
Task: "T004 snippetOf em shared/lib"
Task: "T006 codeRanges e foldText exportados por links"
Task: "T007 seed do dev:mock"
```

## Parallel Example: User Story 2

```bash
Task: "T012 search-query.test.ts"
Task: "T013 search-occurrences.test.ts"
Task: "T014 search-index.test.ts"
Task: "T015 search-panel.test.tsx"
Task: "T016 workspace-search.test.tsx (busca completa)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup.
2. Phase 2: Foundational. **Crítico.**
3. Phase 3: US1.
4. **Parar e validar**: passos 1 a 3 do quickstart §4.

O resultado é abrir qualquer nota pelo nome, só com o teclado.

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. US1 → MVP (busca rápida).
3. US2 → busca completa por texto.
4. US3 → filtros.
5. US4 → sugestões.
6. Polish → e2e, desempenho, docs, revisão, app desktop.

---

## Notes

- 39 tarefas. As marcadas [P] tocam arquivos diferentes e não dependem de tarefas incompletas.
- Todo CA-BUSCA-* da spec tem teste com o ID no nome: 005-01..05 (T008), 001-01..06, 003-01,
  004-01 (T014, T015), 002-01..07 (T025, T026), 006-01..04 (T030, T031).
