---

description: "Lista de tarefas da feature 003 — Backlinks"
---

# Tasks: Backlinks

**Input**: Design documents from `/specs/003-backlinks/`

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
- **[Story]**: história da spec (US1..US3)
- Todo caminho é relativo à raiz do repositório

## Regras que valem para toda tarefa

- Nomes em minúsculas com hífen ou `assunto.tipo.ts` (NOM-01, NOM-04); exportação nomeada (NOM-02);
  `@/` fora do módulo, relativo dentro (NOM-03), inclusive nos testes.
- Só crie o arquivo quando ele for usado (NOM-05); o `index.ts` exporta só o que outro módulo usa
  (NOM-06).
- Texto para o usuário em português (IDI-01); código e comentários em inglês, uma linha, com o porquê
  (IDI-02, COD-01, COD-02).
- UI só com shadcn instalado pela CLI (CMP-01), composição por `render` (CMP-03), sem cor pronta nem
  medida entre colchetes (COR-01, COR-03); textos exatamente como em [contracts/ui.md](./contracts/ui.md).
- `features/backlinks` nunca importa `features/editor`; `features/links` nunca importa `vault` nem
  `editor` (plan, "Fluxo de dependências").
- Exibir o painel nunca grava arquivo (FR-017); linkar só grava sobre o conteúdo que o app conhece
  (princípio II).
- Nome de teste cita o ID do critério, ex.: `it("CA-BACK-003-01 — palavra parcial não conta", ...)`.
- Interação em teste de componente com `user-event` (TST-04), inclusive teclas no editor.
- Rode `pnpm verify` ao fim de cada fase.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: as peças shadcn novas e o registro das regras novas nos documentos

- [X] T001 [P] Instalar pela CLI do shadcn, depois de consultar o registro (LAY-08): `pnpm exec shadcn add item scroll-area`, gerando `src/shared/components/ui/item.tsx` e `src/shared/components/ui/scroll-area.tsx` (research R7). Conferir que nenhum arquivo existente de `ui/` foi sobrescrito (`git diff src/shared/components/ui`)
- [X] T002 [P] Atualizar `docs/regras-de-negocio.md` §9 com os cenários [novo] da spec, no formato das specs anteriores (`(Tipo · RN · spec 003)`): CA-BACK-001-01 a 06, CA-BACK-002-02, CA-BACK-003-02/03/04 e CA-BACK-004-01 a 04; e a linha de RN-BACK-* na matriz do §11. Em `CHANGELOG.md`, seção "Não lançado", a linha "Feature 003 — Backlinks (`specs/003-backlinks/`)"

**Checkpoint**: `pnpm verify` verde, sem mudança de comportamento

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: o texto das notas no índice, a regra de menção, abrir a nota num ponto e as composições do painel

**⚠️ CRITICAL**: nenhuma história começa antes desta fase terminar

### Núcleo puro em `links`

- [X] T003 [P] Em `src/features/links/tests/links-index.test.ts`, acrescentar os casos de `textOf(path)`: devolve o texto do último `update`, `undefined` para caminho desconhecido e depois de `remove`, e acompanha `rename` (o texto passa para o caminho novo). Implementar em `src/features/links/model/links.index.ts` guardando o texto no `update` das notas e canvas (research R2, data-model "Mudanças em entidades existentes")
- [X] T004 [P] Escrever `src/features/links/tests/links-mentions.test.ts` com `findMentions(text, name)` e `mentionLink(...)` (data-model "Mention" e "Texto do link de uma menção"):
  - **CA-BACK-003-01** (modelo): `api` não é menção em "rapidamente", "api-gateway" nem "api_v2"; é em "a api," e "(api)";
  - **CA-BACK-003-02** (modelo): "Deploy" conta para `deploy`, com `text: "Deploy"`;
  - **CA-BACK-003-03** (modelo): nada dentro de `[[deploy]]`, `![[deploy]]`, `[[release|o deploy]]`, cerca ``` nem código inline;
  - **CA-BACK-003-04** (modelo): "a ideia nova do time" é menção de `ideia nova`;
  - acentos contam: "configuracao" não é menção de `configuração`; "Configuração" é;
  - nome com menos de 3 caracteres (`db`, `a`) devolve `[]`;
  - posições são do texto cru: com BOM e CRLF, `text.slice(start, end)` é a menção;
  - `mentionLink`: nome único devolve `[[Deploy]]` para o texto "Deploy"; nome repetido (`backend/api` e `frontend/api`) devolve `[[backend/api|api]]` para o alvo `backend/api.md`.
- [X] T005 Implementar `src/features/links/model/links.mentions.ts` com `findMentions` e `mentionLink` pelas regras de research R3 e R4: expressão regular Unicode `iu` com o nome escapado em NFC e as fronteiras `(?<![\p{L}\p{N}_-])` / `(?![\p{L}\p{N}_-])`; ocorrências descartadas dentro dos trechos de código (reaproveitar `codeRanges` de `links.parser.ts`, exportado só dentro do módulo) e de qualquer `[[...]]` devolvido por `parseLinks`. Exportar `findMentions` e `mentionLink` em `src/features/links/index.ts`. **Esperado**: T004 passa

### Abrir a nota num ponto

- [X] T006 [P] Escrever `src/features/editor/tests/note-reveal.test.tsx`: `open("infra.md", { offset: 30 })` deixa o cursor na posição 30; abrir a mesma nota de novo com outro `offset` move o cursor; `{ heading }` da 002 continua funcionando. Implementar em `src/features/editor/note.store.ts` e `src/features/editor/components/note-editor.tsx` trocando o `headingRequest` por um único pedido de revelação (`{ heading } | { offset }`), com `scrollIntoView` (research R8)

### Composições do painel (`shared/components`)

- [X] T007 [P] Criar `src/shared/components/app-panel.tsx` (LAY-03): `section` com `aria-label` do título; cabeçalho com `h2` do título e `actions`; corpo em `ScrollArea`; props `title`, `actions?` e `children`. Sem estado próprio
- [X] T008 [P] Criar `src/shared/components/app-note-list.tsx` (LAY-02) com o tipo `NoteListItem` de [contracts/modules.md](./contracts/modules.md): `ItemGroup` de `Item`; `ItemMedia` com o ícone; `ItemContent` com `ItemTitle` (nome) e `ItemDescription` (pasta); abaixo, um `Button` `variant="ghost"` por trecho (conteúdo com `mark` destacado por token, `Badge` opcional) e, quando houver, o `Button` da ação com o nome acessível do trecho (CMP-10)
- [X] T009 [P] Em `src/shared/components/app-shell.tsx`, aceitar `aside?: ReactNode`: com valor, um `ResizableHandle` e um `ResizablePanel` à direita (`defaultSize="24%"`, `minSize="16%"`, `maxSize="40%"`, LAY-05); sem valor, nada muda. Em `src/shared/components/app-editor-frame.tsx`, aceitar `actions?: ReactNode` no fim do cabeçalho. Conferir que os testes existentes continuam verdes

### Seed

- [X] T010 [P] Ampliar `src/mocks/demo-vault.ts` com o vault de [quickstart.md](./quickstart.md) §4, sem tirar nada: menções sem link em `infra` ("o deploy falhou") e `runbook` ("Rodar o Deploy de novo."); `rapido.md` ("rapidamente, api-gateway e api_v2"); `notas.md` com `[[backend/api]]`, `[[api]]` e "a api (nova)"; `db.md`. Rodar `pnpm test:e2e`: `e2e/vault.spec.ts` e `e2e/links.spec.ts` continuam verdes (ajustar expectativa só se a mudança for legítima, com o motivo no teste)

### Índice e entradas em dia

- [X] T011 Em `src/features/vault/vault.store.ts` (`onExternal`), depois de atualizar o índice com a leitura em lote, atualizar `entries` com o próprio evento (tira as removidas, acrescenta as criadas e marca as alteradas), e não só marcar as modificadas, para que `entries` mude depois do índice pronto (research R6; o `refresh` de 100 ms pode trocar `entries` antes de a leitura terminar, e o painel recalcularia com o índice velho). Teste em `src/features/vault/tests/vault-external.test.tsx`: nota criada por fora com `[[deploy]]` faz `entries` mudar depois de `linkIndex.linksTo("deploy.md")` já incluí-la

**Checkpoint**: `pnpm verify` verde

---

## Phase 3: User Story 1 - Ver quem aponta para a nota (Priority: P1) 🎯 MVP

**Goal**: painel à direita com as notas que têm link para a aberta, trecho de cada link e clique para ir até ele

**Independent Test**: com `infra` e `runbook` apontando para `deploy`, abrir `deploy`, ver as duas no painel e abrir uma no ponto do link (spec, US1)

### Tests for User Story 1 ⚠️

- [X] T012 [P] [US1] Escrever `src/features/backlinks/tests/backlinks-list.test.ts` com `backlinkGroups(index, path)` e o trecho (data-model "Backlink", "BacklinkGroup", "Trecho"):
  - **CA-BACK-001-01** (modelo): `infra` e `runbook` com `[[deploy]]` geram dois grupos, em ordem alfabética, com nome e pasta;
  - **CA-BACK-001-03** (modelo): `[[backend/api]]` conta para `backend/api`; `[[api]]` com duas notas `api` não conta para nenhuma;
  - **CA-BACK-001-04** (modelo): três links na mesma nota viram um grupo com três ocorrências, na ordem do texto;
  - `![[deploy]]` vem com `embed: true`; a própria nota não aparece;
  - trecho: a linha sem espaços nas pontas; linha de mais de 120 caracteres cortada em volta da ocorrência com "…"; posição da ocorrência dentro do trecho correta.
- [X] T013 [P] [US1] Escrever `src/features/backlinks/tests/backlinks-panel.test.tsx`, montando `BacklinksPanel` sobre o adapter de memória:
  - **CA-BACK-001-01**: com `deploy` aberta, aparecem `infra` e `runbook` com a pasta e o trecho de cada link;
  - **CA-BACK-001-04**: `infra` aparece uma vez, com três trechos;
  - **CA-BACK-001-05**: `simulateExternal` que tira o link de `runbook` faz ela sair do painel sem remontar; outra nota que ganha link entra;
  - **CA-BACK-001-06**: sem backlinks, "Nenhuma nota aponta para esta.";
  - enquanto o índice não está pronto, `Skeleton` com `aria-busy`;
  - **CA-BACK-001-02** (painel): clicar no segundo trecho de `infra` chama `onOpen("infra.md", offset)` com a posição do segundo link; o botão "Esconder backlinks" chama `onClose`;
  - o link de incorporação mostra o `Badge` "incorporação";
  - `[[ideia nova]]` numa nota passa a aparecer no painel de `ideia nova` quando ela é criada; renomear pelo app a nota que aponta mantém ela no painel, com o nome novo (spec, Edge Cases);
  - montar, recalcular e desmontar o painel não chama `writeText` (FR-017).
- [X] T014 [P] [US1] Escrever `src/app/tests/workspace-backlinks.test.tsx` (integração): **CA-BACK-001-02** com `deploy` aberta, clicar no segundo trecho de `infra` abre `infra` com o cursor no segundo `[[deploy]]`; `Ctrl+Shift+B` esconde e mostra o painel; o botão do cabeçalho do editor alterna com os nomes "Esconder backlinks" / "Mostrar backlinks"; sem nota aberta, não há painel

### Implementation for User Story 1

- [X] T015 [US1] Implementar `src/features/backlinks/model/backlinks.list.ts`: `backlinkGroups(index, path)` a partir de `linksTo` e `textOf`, agrupando por `source`, sem a própria nota, grupos por caminho e ocorrências por posição; e `snippetOf(text, start, end)` devolvendo `{ before, match, after }` pela regra de data-model "Trecho". **Esperado**: T012 passa
- [X] T016 [US1] Criar `src/features/backlinks/components/backlinks-panel.tsx`: `AppPanel` com título "Backlinks" e o botão de fechar; seção "Links para esta nota" com a contagem e `AppNoteList` (ícone `FileText`, pasta "raiz" na raiz, `Badge` "incorporação"); `Empty` com `Link2Off` quando vazia; `Skeleton` enquanto `linkIndex` é `null`. Calcula na hora ao montar e ao trocar de nota (SC-001); depois, recalcula quando `entries` ou `linkIndex` mudam no `useVaultStore`, com atraso de 300 ms (research R6). Criar `src/features/backlinks/index.ts` exportando `BacklinksPanel`. **Esperado**: T013 passa
- [X] T017 [US1] Em `src/app/workspace.tsx`, com uma nota aberta: passar `aside={<BacklinksPanel ... />}` ao `AppShell` quando o painel estiver visível (aberto por padrão, estado da sessão); `onOpen` chama `useNoteStore.getState().open(path, { offset })`; atalho `Ctrl+Shift+B` (`metaKey` no macOS) num `keydown` da janela; botão no cabeçalho do editor com ícone `PanelRight`, `Tooltip` e `Kbd` (LAY-06), passado ao `NoteEditor` por uma prop `actions` repassada ao `AppEditorFrame`. **Esperado**: T014 passa
- [X] T018 [US1] Criar `src/features/backlinks/README.md` (RN-BACK-001, o que conta como link, atualização automática) e atualizar `src/features/editor/README.md` (`open(path, { offset })` e a ação no cabeçalho)

**Checkpoint**: US1 funciona sozinha; T012–T014 verdes; passos 1, 2, 5 e 10 do quickstart §4 ok

---

## Phase 4: User Story 2 - Descobrir menções sem link (Priority: P2)

**Goal**: seção recolhida com as notas que citam o nome sem link

**Independent Test**: com `infra` citando "deploy" sem link e outra nota só com "rapidamente", abrir `deploy` e `api` e conferir as menções (spec, US2)

### Tests for User Story 2 ⚠️

- [X] T019 [P] [US2] Em `src/features/backlinks/tests/backlinks-list.test.ts`, acrescentar `mentionGroups(index, path)`: **CA-BACK-002-01** (modelo) `infra` com "o deploy falhou" gera um grupo; a própria nota não entra; nota com nome de menos de 3 caracteres devolve `{ shortName: true }` sem grupos; ocorrências na ordem do texto, cada uma com trecho
- [X] T020 [P] [US2] Em `src/features/backlinks/tests/backlinks-panel.test.tsx`, acrescentar: **CA-BACK-002-02** a seção "Menções sem link (N)" vem recolhida, com a contagem visível, e abre ao clicar; **CA-BACK-002-01** (exibição) aberta, mostra `infra` com o trecho; **CA-BACK-003-01** abrindo o painel de `api`, a nota com "rapidamente" não aparece; **CA-BACK-003-02** "Deploy" aparece; **CA-BACK-003-03** `infra` só com `[[deploy]]` e código aparece nos links e não nas menções; **CA-BACK-003-04** `ideia nova`; sem menções, "Nenhuma menção sem link."; nome curto, "Menções não são procuradas para nomes com menos de 3 caracteres."; trocar de nota recolhe a seção de novo; clicar num trecho de menção chama `onOpen(source, offset)` com a posição da menção (FR-010)

### Implementation for User Story 2

- [X] T021 [US2] Em `src/features/backlinks/model/backlinks.list.ts`, implementar `mentionGroups(index, path)` com `findMentions` sobre `notePaths` e `textOf`, sem a própria nota, com o nome por `basenameOf` e o trecho de `snippetOf`. **Esperado**: T019 passa
- [X] T022 [US2] Em `src/features/backlinks/components/backlinks-panel.tsx`, acrescentar a seção de menções num `Collapsible` recolhido por padrão (e recolhido de novo ao mudar `path`), com o gatilho "Menções sem link (N)", a lista `AppNoteList` e as mensagens de vazio e de nome curto de [contracts/ui.md](./contracts/ui.md). **Esperado**: T020 passa
- [X] T023 [US2] Atualizar `src/features/backlinks/README.md` (RN-BACK-002, RN-BACK-003, regra de palavra inteira e de nome curto) e `src/features/links/README.md` (`findMentions`, `mentionLink`, `textOf`)

**Checkpoint**: T019–T020 verdes; passos 3, 7 e 11 do quickstart §4 ok

---

## Phase 5: User Story 3 - Transformar menção em link (Priority: P2)

**Goal**: "Linkar" troca só aquela menção por um link, sem abrir a outra nota e sem perder nada

**Independent Test**: com `infra` citando "deploy" sem link, linkar pelo painel de `deploy` e conferir o disco (spec, US3)

### Tests for User Story 3 ⚠️

- [X] T024 [P] [US3] Escrever `src/features/vault/tests/vault-mention.test.ts` com `linkMention` sobre o adapter de memória:
  - **CA-BACK-002-01** (ação): devolve `"linked"`; `infra.md` passa a ter `[[deploy]]` no lugar da menção;
  - **CA-BACK-004-01**: "Deploy" vira `[[Deploy]]` e o resto do arquivo fica igual byte a byte, com BOM e CRLF;
  - **CA-BACK-004-02**: com `backend/api` e `frontend/api`, vira `[[backend/api|api]]`;
  - **CA-BACK-004-03**: `simulateExternal(..., { silent: true })` muda `infra.md` antes; devolve `"changed"`, o disco fica com o conteúdo externo e o índice passa a ter esse texto;
  - **CA-BACK-004-04**: com duas menções, só a escolhida vira link;
  - `failWritesOn(["infra.md"])` devolve `"failed"` e nada muda;
  - a gravação não chega ao `watcher` como alteração externa (ledger), atualiza `modifiedAt` de `infra` e emite `onEntryEvent({ kind: "rewritten", path: "infra.md" })`.
- [X] T025 [P] [US3] Em `src/features/backlinks/tests/backlinks-panel.test.tsx`, acrescentar: clicar "Linkar" (nome "Linkar menção em infra") mostra "Menção em “infra” virou link.", a menção sai da lista e `infra` aparece nos links; arquivo mudado por fora mostra "“infra” mudou fora do Dev Notes. A lista foi atualizada."; falha mostra "Não foi possível gravar “infra”. Nada foi alterado."; só pelo teclado, `Tab` chega ao trecho e ao botão "Linkar" e `Enter` executa cada um ([contracts/ui.md](./contracts/ui.md) "Itens")

### Implementation for User Story 3

- [X] T026 [US3] Em `src/features/vault/vault.store.ts`, implementar `linkMention(mention, target)` pela research R5: `runBeforeMutate([path])`; ler o arquivo; se diferente do `textOf` do índice ou se o trecho não for `mention.text`, atualizar o índice com o que leu, trocar `entries` (para o painel recalcular) e devolver `"changed"`; senão, trocar só `[start, end)` por `mentionLink`, gravar com `storage.writeText`, atualizar índice e `modifiedAt` e emitir `rewritten`; erro de gravação devolve `"failed"` sem alterar nada. **Esperado**: T024 passa
- [X] T027 [US3] Em `src/features/backlinks/components/backlinks-panel.tsx`, a ação "Linkar" de cada menção chama `linkMention` com a nota aberta como alvo e mostra os avisos de [contracts/ui.md](./contracts/ui.md) por resultado. **Esperado**: T025 passa
- [X] T028 [US3] Atualizar `src/features/backlinks/README.md` (RN-BACK-004) e `src/features/vault/README.md` (`linkMention` e suas garantias)

**Checkpoint**: T024–T025 verdes; passos 4, 6, 8 e 9 do quickstart §4 ok; todas as histórias funcionam

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: jornada no navegador, desempenho, documentação e revisão

- [X] T029 [P] Escrever `e2e/backlinks.spec.ts` (Playwright no `dev:mock`) com a jornada de [quickstart.md](./quickstart.md) §3: abrir `deploy`, ver `infra` e `runbook` no painel, abrir a seção de menções, linkar a de `infra` e ver o link no texto de `infra`
- [X] T030 [P] Em `src/features/backlinks/tests/backlinks-performance.test.ts` (no próprio módulo, para o `vault` não depender do `backlinks`), com um vault de 5.000 notas gerado no teste: `backlinkGroups` de `alvo` em menos de 500 ms e `mentionGroups` de `alvo` em menos de 2 s (SC-001); outros módulos só pelos `index.ts`
- [X] T031 Medir no app desktop, com o vault sintético depois da primeira leitura (antivírus), as metas do quickstart §5, mais o tempo de abrir uma nota com o painel visível e escondido (SC-002: a diferença não pode tirar a abertura das metas da 001), e rodar o roteiro manual da §4 no Windows (pode ser dirigido pelo protocolo de depuração do WebView2, como na validação da 002); registrar números, máquina e resultados no fim de `specs/003-backlinks/quickstart.md`
- [X] T032 [P] Atualizar `docs/arquitetura.md`: §5 com o módulo `backlinks` implementado, §6.2 com `app-panel` e `app-note-list` existentes e o lado direito do `app-shell`, §9 com RN-BACK-* em `backlinks` (painel), `links` (regra de menção) e `vault` (gravar)
- [X] T033 Rodar a skill `app-review-standards` sobre todas as mudanças e corrigir o que for "Bloqueia" e "Deveria corrigir"
- [ ] T034 Rodar `pnpm verify` e `pnpm test:e2e`; roteiro manual da §4 no macOS e no Linux quando houver máquina (2026-09-30: `verify` e `test:e2e` verdes no Windows; macOS e Linux pendentes)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup (T001 para T007 e T008) e **bloqueia as histórias**.
- **US1 (Phase 3)**: depende da Foundational.
- **US2 (Phase 4)**: depende da US1 (o painel).
- **US3 (Phase 5)**: depende da US2 (a lista de menções).
- **Polish (Phase 6)**: depende das histórias desejadas.

### User Story Dependencies

```text
Setup → Foundational → US1 → US2 → US3
```

- **US1 (P1)**: nenhuma outra história.
- **US2 (P2)**: US1.
- **US3 (P2)**: US2. O `linkMention` (T024, T026) só depende da Foundational e pode andar junto com a US1 e a US2; só o botão (T025, T027) precisa da lista de menções.

### Within Each User Story

- Testes escritos e falhando antes da implementação.
- Modelo puro antes do componente; componente antes da integração no `workspace`.
- A história fica pronta, com `pnpm verify` verde, antes da próxima.

### Arquivos disputados

- `src/features/backlinks/components/backlinks-panel.tsx`: T016, T022, T027, nessa ordem.
- `src/features/backlinks/model/backlinks.list.ts`: T015, T021.
- `src/features/backlinks/tests/backlinks-panel.test.tsx` e `backlinks-list.test.ts`: casos de mais de uma história; quem vier depois só acrescenta.
- `src/features/editor/components/note-editor.tsx`: T006, T017.
- `src/features/vault/vault.store.ts`: T011, T026.

### Parallel Opportunities

- Setup: T001 e T002 juntos.
- Foundational: T003, T004, T006, T007, T008, T009, T010 e T011 em arquivos diferentes, juntos; T005 depois do T004.
- US1: os testes T012–T014 juntos.
- `linkMention` (T024, T026) em paralelo com a US1/US2.
- Polish: T029, T030 e T032 juntos.

---

## Parallel Example: Foundational

```bash
Task: "T003 textOf em links.index.ts"
Task: "T004 links-mentions.test.ts"
Task: "T006 open(path, { offset }) no editor"
Task: "T007 app-panel.tsx"
Task: "T008 app-note-list.tsx"
Task: "T009 aside no app-shell e actions no app-editor-frame"
Task: "T010 seed do dev:mock"
Task: "T011 entries em dia depois do índice (vault.store)"
```

## Parallel Example: User Story 1

```bash
Task: "T012 backlinks-list.test.ts"
Task: "T013 backlinks-panel.test.tsx"
Task: "T014 workspace-backlinks.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup.
2. Phase 2: Foundational. **Crítico.**
3. Phase 3: US1.
4. **Parar e validar**: passos 1, 2, 5 e 10 do quickstart §4.

O resultado é a navegação nos dois sentidos: de qualquer nota, ver e abrir quem aponta para ela.

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. US1 → MVP (painel de backlinks).
3. US2 → menções sem link.
4. US3 → linkar menção.
5. Polish → e2e, desempenho, docs, revisão, app desktop.

---

## Notes

- 34 tarefas. As marcadas [P] tocam arquivos diferentes e não dependem de tarefas incompletas.
- O rótulo [USn] liga a tarefa à história da spec para rastreabilidade.
- Faça commit a cada tarefa ou grupo lógico.
- Evite: tarefas vagas, dois agentes no mesmo arquivo, exportar pelo `index.ts` o que nenhum módulo
  de fora usa, composições `app-*` sem uso (NOM-05, NOM-06, COD-04).
