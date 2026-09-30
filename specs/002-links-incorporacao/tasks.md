---

description: "Lista de tarefas da feature 002 — Links e Incorporação"
---

# Tasks: Links e Incorporação

**Input**: Design documents from `/specs/002-links-incorporacao/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/links-module.md](./contracts/links-module.md),
[contracts/shared-vault.md](./contracts/shared-vault.md), [contracts/ui.md](./contracts/ui.md),
[quickstart.md](./quickstart.md)

**Tests**: obrigatórios. A constituição ("Fluxo de Desenvolvimento e Portões de Qualidade") exige
que todo critério `CA-*` vire teste Vitest sobre o adapter em memória e que as jornadas
principais tenham Playwright; a jornada "linkar", adiada pela 001, entra aqui. Nesta lista os
testes vêm antes da implementação: escreva-os, confirme que falham e só então implemente.

**Organization**: tarefas agrupadas por história de usuário, para que cada uma possa ser
implementada e testada de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história da spec (US1..US5)
- Todo caminho é relativo à raiz do repositório

## Regras que valem para toda tarefa

- Nomes de arquivo em minúsculas com hífen ou `assunto.tipo.ts` (NOM-01, NOM-04); exportação
  nomeada (NOM-02); `@/` fora do módulo, relativo dentro (NOM-03), inclusive nos testes.
- Só crie o arquivo quando ele for usado (NOM-05). O `index.ts` exporta só o que outro módulo usa
  (NOM-06).
- Texto para o usuário em português (IDI-01); código e comentários em inglês (IDI-02, COD-02).
- UI só com shadcn, consultando o MCP do shadcn antes (CMP-01, LAY-08). Composição por `render`,
  nunca `asChild` (CMP-03). Nada de cor pronta nem medida entre colchetes (COR-01, COR-03). Dentro
  do `app-editor-frame`, as peças do CodeMirror (destaque, lista do autocomplete, corpo do bloco de
  incorporação) usam só `var(--token)` (LAY-07).
- Features nunca importam `@tauri-apps/*` (princípio III). Tudo passa por `@/shared/vault`, e
  capacidade nova entra nos dois adapters e na suíte de contrato.
- `features/links` nunca importa `features/vault` nem `features/editor` (plan, "Fluxo de
  dependências"). Validação de nome (`validateName`) fica no `vault`.
- Exibir links e incorporações nunca grava arquivo (FR-024). Criar nota pelo link nunca
  sobrescreve: se o arquivo já existe, só abre (princípio II).
- Nome de teste cita o ID do critério, ex.: `it("CA-LINK-001-01 — link pendente cria nota", ...)`.
  Cenários [novo] sem ID usam a história e o número: `US1-9`, `US3-6`, `US4-6`.
- Seguir link nos testes em jsdom é feito com `Mod-Enter`, porque o jsdom não tem layout e o
  CodeMirror não acha a posição de um clique (research R10). O `Ctrl`+clique é coberto no
  Playwright.
- Rode `pnpm verify` ao fim de cada fase.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: a única dependência nova, o registro das regras novas e o ADR dos dados do app em `.devnotes/`

- [X] T001 Adicionar `@codemirror/autocomplete` com versão exata `6.20.3` em `package.json` via `pnpm add -E @codemirror/autocomplete@6.20.3` (FER-02, research R11) e conferir que os `peerDependencies` dele aceitam o `@codemirror/state` 6.7.6 e o `@codemirror/view` 6.43.13 instalados. Em `CHANGELOG.md`, seção "Não lançado", adicionar a dependência nova e a linha "Feature 002 — Links e Incorporação (`specs/002-links-incorporacao/`)"
- [X] T002 [P] Atualizar `docs/regras-de-negocio.md` §9 com os cenários [novo] da spec, com o texto de lá: CA-LINK-004-01/02/03, CA-LINK-002-01 a 05, CA-LINK-001-02/03/04, CA-LINK-005-01 a 05, CA-LINK-003-01/02, CA-EMBED-001-01/02/03 e CA-EMBED-002-01. No glossário (§3), registrar a diferença entre link pendente e link quebrado e o registro de notas excluídas em `.devnotes/deleted-notes.json`. Não depende de código: roda junto com o Setup, para que o documento de regras não fique atrás da spec
- [X] T003 [P] Escrever `docs/decisions/0015-app-data-in-devnotes.md`, no formato e na numeração dos ADRs existentes, com status **Aceito**, registrando a ADR-009 de `docs/arquitetura.md` §11 ("Dados do app em `.devnotes/`"): o registro de notas excluídas é o primeiro dado do app no vault, em JSON validado por Zod, apagável sem perda (princípio II); o acesso é por `AppDataStore` e por dois comandos Rust próprios, porque no Unix o escopo `raiz/**` do Tauri não cobre pastas iniciadas por ponto (research R4); e o tradeoff da §11 (vault portátil vs. pasta extra a ignorar quando houver Git). Na §11, mudar a ADR-009 para **Aceito** (`decisions/0015`)

**Checkpoint**: `pnpm install` e `pnpm verify` verdes, sem mudança de comportamento

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `modifiedAt` e `AppDataStore` em `shared/vault` (os dois adapters, a suíte de contrato e os comandos Rust), o núcleo puro de resolução de links e o seed do `dev:mock`

**⚠️ CRITICAL**: nenhuma história começa antes desta fase terminar

### `shared/vault`: `modifiedAt` e `AppDataStore`

- [X] T004 Em `src/shared/vault/vault.types.ts`, adicionar ao `VaultEntry` o campo `modifiedAt: number` ("Data de modificação do arquivo, em ms desde 1970. Pastas: 0."), a interface `AppDataStore` com `read(name: string): Promise<string | null>` e `write(name: string, content: string): Promise<void>` e o campo `appData: AppDataStore` em `OpenVault`, exatamente como [contracts/shared-vault.md](./contracts/shared-vault.md). Corrigir todo literal de `VaultEntry` do projeto para ter `modifiedAt` (varra `src/` inteiro: `entryFor` em `src/features/vault/model/vault.operations.ts`, `src/features/vault/tests/fixtures/synthetic-vault.ts` e os testes), usando `Date.now()` para nota criada pelo app e `0` para pasta
- [X] T005 Escrever os casos novos em `src/shared/vault/tests/vault-contract.test.ts`, dentro de `runVaultContract` (valem para os dois adapters):
  - `list()` traz `modifiedAt` numérico em cada entrada, `0` nas pastas, e o de uma nota aumenta depois de um `writeText` (com timers falsos ou relógio avançado);
  - `appData.read("deleted-notes.json")` de arquivo inexistente devolve `null`;
  - `appData.write` seguido de `appData.read` devolve o mesmo conteúdo;
  - nome fora de `^[a-z0-9-]+\.json$` (`"../x.json"`, `"Notas.json"`, `"x.txt"`, `"a/b.json"`, `""`) rejeita com `VaultError` de código `invalid-name`;
  - o arquivo gravado por `appData` não aparece em `list()` e não chega ao `watcher.subscribe`.
- [X] T006 Implementar em `src/shared/vault/adapters/memory/memory-vault.ts`:
  - `modifiedAt` por caminho, atualizado em cada `writeText`, `move` (o destino herda a hora da operação) e `simulateExternal`; o seed nasce com horários crescentes na ordem das chaves;
  - `options.modifiedAt?: Record<VaultPath, number>` em `MemoryVaultOptions` para fixar horários no teste;
  - `appData` no mesmo `Map` dos arquivos, em `.devnotes/<name>` (como a pasta real; o seed pode trazer o registro), validando o nome com `^[a-z0-9-]+\.json$` (`invalid-name`), registrando a escrita no ledger antes de gravar, como as outras escritas (princípio II);
  - extra só para teste `appDataFiles(): Record<string, string>`.

  **Esperado**: T005 passa no adapter `memory`
- [X] T007 [P] Em `src-tauri/src/vault.rs` (research R4):
  - `ScanEntry` ganha `modified_at: u64` serializado como `modifiedAt` (`#[serde(rename_all = "camelCase")]` ou `rename`), lido de `metadata.modified()` em ms desde 1970; pastas com `0`;
  - comandos `vault_app_data_read(name) -> Option<String>` e `vault_app_data_write(name, content)`, que validam `name` com `^[a-z0-9-]+\.json$` (sem crate de regex: conferir os caracteres à mão) e resolvem sempre `<raiz>/.devnotes/<name>` a partir de `current_root`, sem passar pelo escopo do `plugin-fs`; `write` cria `.devnotes/` se faltar; nome inválido vira `invalid-name`, arquivo ausente na leitura vira `None`;
  - a pasta `.devnotes/` e o arquivo nunca são seguidos se forem link simbólico (conferir com `symlink_metadata`, como o `scan` da 001), e o caminho canonizado da pasta precisa ficar dentro da raiz canonizada; senão, `invalid-name`, sem ler nem gravar nada fora do vault;
  - `#[cfg(test)]`: nome inválido (`../x.json`, `A.json`, `x.txt`, `a/b.json`), leitura de arquivo ausente, `write` seguido de `read`, o arquivo gravado fica em `.devnotes/` e não aparece no `scan`, `.devnotes` como link simbólico para fora do vault é recusado na leitura e na gravação (com o mesmo `link_dir` dos testes da 001), e `scan` devolve `modifiedAt > 0` para nota e `0` para pasta.

  Registrar os dois comandos em `src-tauri/src/lib.rs`
- [X] T008 [P] Adicionar `vault_app_data_read` e `vault_app_data_write` à lista de comandos de `src-tauri/build.rs` e `allow-vault-app-data-read` e `allow-vault-app-data-write` às permissões de `src-tauri/capabilities/default.json` ([contracts/shared-vault.md](./contracts/shared-vault.md)); não acrescentar escopo do `plugin-fs`
- [X] T009 Depois de T007, implementar em `src/shared/vault/adapters/tauri/tauri-vault.ts`: `list()` repassa o `modifiedAt` do `vault_scan`; `appData.read` e `appData.write` usam `invoke("vault_app_data_read" | "vault_app_data_write")`, validam o nome antes (mesmo padrão e código `invalid-name` do adapter de memória), registram a escrita no ledger antes da chamada e convertem os erros em `VaultError`. **Esperado**: `pnpm typecheck` e `pnpm test:rust` verdes

### Núcleo puro dos links (usado por todas as histórias)

- [X] T010 [P] (Removido na revisão do T059: nenhum código do app usava o método, COD-04.) Em `src/features/links/tests/links-index.test.ts`, adicionar os casos de `namesake(name)`: devolve os caminhos das notas cuja `nameKey` do nome é igual (`"API"` acha `backend/api.md` e `frontend/api.md`), lista vazia para nome inexistente, ignora canvas e outros arquivos, e acompanha `update`, `remove` e `rename`. Implementar `namesake(name): VaultPath[]` em `src/features/links/model/links.index.ts` (data-model "Entidades que continuam da 001")
- [X] T011 [P] Escrever `src/features/links/tests/links-deleted.test.ts` (data-model "DeletedNotesRegistry"):
  - `parseDeletedNotes(null)`, JSON inválido, `version` diferente de `1` e entrada sem `path` viram registro vazio, sem lançar erro;
  - `serializeDeletedNotes` seguido de `parseDeletedNotes` devolve o mesmo registro;
  - `withDeleted(notes, ["deploy.md"], at)` acrescenta com `deletedAt` em ISO 8601 e, se o caminho já estava, só atualiza a data;
  - o registro guarda "no máximo 5.000, a mais antiga sai primeiro";
  - `withoutExisting(notes, entries)` tira os caminhos que voltaram a existir comparando pela `nameKey` do caminho (`Deploy.md` existente tira `deploy.md`).
- [X] T012 Implementar `src/features/links/model/links.deleted.ts` (`parseDeletedNotes`, `serializeDeletedNotes`, `withDeleted`, `withoutExisting`, tipo `DeletedNotes`) e o `deletedNotesSchema` em `src/features/links/types/links.schemas.ts`: `{ version: 1, notes: [{ path, deletedAt }] }`, com `path` terminando em `.md` e `deletedAt` em ISO 8601 (Zod 4.5.4). **Esperado**: T011 passa
- [X] T013 [P] Escrever `src/features/links/tests/links-target.test.ts` com `resolveLinkTarget`, na ordem da tabela de data-model "LinkTarget":
  - `valid`: `[[deploy]]` com nome único, `[[Deploy]]` (maiúsculas não contam), `[[deploy.md]]`, `[[backend/api]]` com `/` como caminho exato; `heading` vem de `#Rollback` sem `#`, e `#^bloco` não gera `heading`;
  - `ambiguous`: `[[util]]` com `backend/util` e `frontend/util`, com `candidates` nas duas;
  - `file`: `[[mapa.canvas]]` com o canvas existente devolve `path` e `kind: "canvas"`, nunca `pending`;
  - `broken`: sem arquivo e com o caminho no registro; sem `/`, casa pelo nome e devolve o excluído mais recente;
  - `pending`: caminho de criação `destino.md` com `/` (`runbooks/rollback.md`) e, sem `/`, na pasta da nota que contém o link (`backend/infra.md` + `[[ideia nova]]` → `backend/ideia nova.md`);
  - `[[]]`, `[[#Seção]]` e `[[|texto]]` (destino vazio) não são link nesta spec: o `parseLinks` da 001 já não gera ocorrência para destino vazio. Acrescentar esses três casos em `src/features/links/tests/links-parser.test.ts` para fixar o comportamento (spec, Edge Cases "Nome vazio").
- [X] T014 Implementar `src/features/links/model/links.target.ts` com `resolveLinkTarget({ link, from, index, entries, deleted }): LinkTarget` e os tipos `LinkTarget` e `LinkState` (`"valid" | "pending" | "broken" | "ambiguous" | "file"`), usando `namesake` do T010 e o registro do T012. A validação de nome do caminho de criação **não** fica aqui (o `links` não importa o `vault`): o `pending` devolve o caminho e quem valida é o `followLink` (T032); por isso `LinkTarget` não tem estado `invalid`, e `[[a:b]]` aparece como pendente. **Esperado**: T013 passa
- [X] T015 [P] Escrever `src/features/links/tests/links-sections.test.ts` e implementar `src/features/links/model/links.sections.ts` com `findSection(text, heading): Section | null` (data-model "Section", research R7): títulos ATX `#` a `######`; a seção vai do início da linha do título até antes do próximo título de nível igual ou menor número; títulos dentro de cercas de código não contam; comparação sem maiúsculas, sem acentos e sem espaços nas pontas (`"antes do deploy"` acha `## Antes do Deploy `); com dois títulos iguais, vale o primeiro; título inexistente devolve `null`
- [X] T016 Exportar em `src/features/links/index.ts` o que os outros módulos passam a usar ([contracts/links-module.md](./contracts/links-module.md)): `resolveLinkTarget`, `parseLinks`, `findSection`, `parseDeletedNotes`, `serializeDeletedNotes`, `withDeleted`, `withoutExisting` e os tipos `LinkTarget`, `LinkState`, `Section`, `DeletedNotes` e `LinkOccurrence`. Não exportar `deletedNotesSchema` se nenhum módulo de fora o usar (NOM-06)

### `vault.store` e seed

- [X] T017 Em `src/features/vault/vault.store.ts`, manter o `modifiedAt` das entradas (research R5):
  - nova ação `noteSaved(path, content)`, que faz `linkIndex.update` e atualiza o `modifiedAt` da entrada; em `src/features/editor/note.store.ts`, trocar o `useVaultStore.getState().linkIndex?.update(path, content)` depois da gravação por `noteSaved`;
  - `applyChangePlan`, `createNote`, `createFolder` e os eventos externos `created`/`modified` atualizam o `modifiedAt` das entradas envolvidas;
  - testes: em `src/features/vault/tests/vault-external.test.tsx`, `modified` externo aumenta o `modifiedAt`; em `src/features/editor/tests/note-autosave.test.tsx`, a gravação automática aumenta o `modifiedAt` da nota em `useVaultStore.getState().entries`.
- [X] T018 [P] Ampliar `src/mocks/demo-vault.ts` com o vault de [quickstart.md](./quickstart.md) §4, mantendo o que já existe:
  - `infra.md` ganha `[[deploy#Rollback]]`, `[[ideia nova]]`, `[[util]]` e `[[mapa.canvas]]`;
  - `deploy.md` ganha `## Rollback` com texto;
  - novos `runbook.md` (`![[checklist]]` e `![[checklist#Antes do deploy]]`), `checklist.md` (`## Antes do deploy` e `## Depois`), `a.md` (`![[b]]`), `b.md` (`![[a]]`) e `frontend/api.md`.

  Varrer quem importa `demoVault` e rodar `pnpm test:e2e`: `e2e/vault.spec.ts` precisa continuar verde. Se a nova `frontend/api.md` mudar o link esperado depois de mover `backend/api` (passa a ser nome repetido, RN-LINK-004), ajustar a expectativa do teste e registrar o motivo no próprio teste

**Checkpoint**: `pnpm verify` verde. A suíte de contrato passa no adapter de memória, `cargo test` passa e o `dev:mock` abre o vault novo

---

## Phase 3: User Story 1 - Navegar pelos links entre notas (Priority: P1) 🎯 MVP

**Goal**: cada link mostra o seu estado no editor; `Ctrl`+clique ou `Ctrl+Enter` abre a nota de destino (e a seção); link quebrado sobrevive ao reabrir o app e oferece recriar a nota

**Independent Test**: num vault com notas que se referenciam, abrir uma nota, seguir um link e conferir que a nota de destino abriu; conferir que um link para nome inexistente tem aparência diferente (spec, US1)

> Diferença em relação às fases do plan.md: o link quebrado e o "Recriar nota" ficam na US1, e não na US2, porque os cenários CA-LINK-002-04/05 são da US1 na spec.

### Tests for User Story 1 ⚠️

- [X] T019 [P] [US1] Escrever `src/features/editor/tests/editor-links.test.tsx`, montando o `NoteEditor` sobre o adapter de memória e conferindo as classes e o `title` de cada link ([contracts/ui.md](./contracts/ui.md) "Links no texto do editor"):
  - **CA-LINK-002-01**: em `infra` com `[[deploy]]` e `[[ideia nova]]`, só `deploy` existindo, os dois links têm classes diferentes, e o estado também aparece no `title` ("Nota ainda não existe · Ctrl+clique para criar");
  - **CA-LINK-002-02**: excluir `deploy` pelo `vault.store` (`deleteEntry`) faz `[[deploy]]` passar a quebrado sem reabrir `infra`, e o texto continua no documento;
  - **CA-LINK-002-05**: recriar `deploy` (por `recreateNote` ou `simulateExternal` `created`) faz o link voltar a válido;
  - **US1-9**: `simulateExternal({ kind: "created", path: "ideia nova.md" })` faz `[[ideia nova]]` passar de pendente a válido sem reabrir a nota (FR-004);
  - `[[util]]` com duas notas `util` tem a classe de ambíguo, e `[[mapa.canvas]]` a de arquivo;
  - `[[Deploy]]`, `[[deploy.md]]` e `[[deploy|como publicar]]` aparecem como válidos;
  - `[[deploy]]` dentro de cerca ``` e de código inline não recebe classe nenhuma;
  - `[[]]` e `[[#Seção]]` não recebem classe nenhuma, e `Mod-Enter` sobre eles não chama `onFollowLink` (spec, Edge Cases "Nome vazio");
  - `Mod-Enter` com o cursor dentro de um link chama a `onFollowLink` recebida pelo `NoteEditor` com a ocorrência e a nota de origem; fora de link, não chama e não impede o comportamento padrão da tecla.
- [X] T020 [P] [US1] Escrever `src/features/vault/tests/vault-follow.test.ts` com `followLink` e o registro de notas excluídas no `vault.store`, sobre o adapter de memória:
  - **CA-LINK-004-01**: `[[deploy]]` de `infra` devolve `{ type: "open", path: "deploy.md" }`;
  - **CA-LINK-004-02**: `[[backend/api]]` com `frontend/api` existente devolve `backend/api.md`;
  - **CA-LINK-004-03**: `[[deploy#Rollback]]` devolve `heading: "Rollback"`;
  - `[[mapa.canvas]]` devolve `{ type: "unsupported", kind: "canvas" }` e não cria nada (FR-011);
  - excluir `deploy` pelo app põe `deploy.md` no registro; excluir uma pasta põe cada nota dela;
  - **CA-LINK-002-04**: seguir `[[deploy]]` depois de excluí-la devolve `{ type: "broken", path: "deploy.md" }` e não cria nada; só `recreateNote` cria (a parte do diálogo fica no T021);
  - **CA-LINK-002-03**: depois de excluir `deploy` e avançar 500 ms, `appDataFiles()["deleted-notes.json"]` lista `deploy.md`; fechar o vault e abrir de novo com a mesma sessão mantém `[[deploy]]` como `broken`;
  - `removed` externo de uma nota com o vault aberto entra no registro; renomear por fora (`removed` + `created`) deixa o nome antigo como `broken`;
  - `recreateNote("deploy.md")` grava a nota vazia no mesmo caminho, tira do registro e devolve `open`; se o arquivo já existir, não sobrescreve e só devolve `open`;
  - uma nota que volta a existir por `created` externo sai do registro (restaurada pela lixeira);
  - `deleted-notes.json` com JSON inválido não gera erro nem toast: o registro começa vazio;
  - renomear ou mover pelo app não põe nada no registro.
- [X] T021 [P] [US1] Escrever `src/app/tests/workspace-links.test.tsx` (integração, `Workspace` sobre o adapter de memória, TST-03 e TST-04):
  - **CA-LINK-004-01**: com `infra` aberta, cursor em `[[deploy]]` e `Mod-Enter`, o editor passa a mostrar `deploy`;
  - **CA-LINK-004-03**: `[[deploy#Rollback]]` abre `deploy` com o cursor na linha `## Rollback`; `[[deploy#Seção inexistente]]` abre no início, sem erro;
  - **CA-LINK-002-04**: com `deploy` excluída, seguir `[[deploy]]` mostra o diálogo "“deploy” foi excluída" com "Recriar nota" e "Cancelar"; "Cancelar" não cria nada; "Recriar nota" cria `deploy.md` vazia e a abre;
  - [FR-012] com edição pendente em `infra`, seguir um link grava `infra` antes de abrir o destino;
  - `[[mapa.canvas]]` mostra o toast "Abrir canvas ainda não está disponível.".

### Implementation for User Story 1

- [X] T022 [US1] Em `src/features/vault/vault.store.ts`, adicionar o registro de notas excluídas (research R4, data-model "DeletedNotesRegistry"):
  - estado `deleted: DeletedNotes`, carregado ao abrir o vault com `parseDeletedNotes(await vault.appData.read("deleted-notes.json"))` e limpo com `withoutExisting(deleted, entries)`;
  - entra: cada nota de `deleteEntry` (inclusive as de uma pasta) e cada nota em `removed` externo;
  - sai: `createNote`, `recreateNote`, `created` externo e qualquer nota que volte a existir (`withoutExisting`);
  - gravação agrupada de 500 ms com `serializeDeletedNotes` em `appData.write("deleted-notes.json", ...)`, e gravação pendente feita na hora em `onBeforeClose`. Falha ao gravar não mostra toast nem interrompe a operação (é auxílio apagável, princípio II);
  - renomear e mover pelo app não mexem no registro.
- [X] T023 [US1] Em `src/features/vault/vault.store.ts`, adicionar `followLink(link: Pick<LinkOccurrence, "target" | "subpath">, from: VaultPath): Promise<FollowOutcome>` e `recreateNote(path): Promise<FollowOutcome>`, exportando o tipo `FollowOutcome` (data-model "FollowOutcome": `open` com `path`, `heading?` e `created?`; `choose` com `candidates`; `broken` com `path`; `invalid` com `reason`; `unsupported` com `kind`). Espera `waitForIndex()` e resolve com `resolveLinkTarget`. Nesta história, implementar os ramos `valid` → `open`, `broken` → `broken` e `file` → `unsupported`. Os ramos `pending` (T032) e `ambiguous` (T051) vêm depois; até lá, devolvem `unsupported` com `kind: "other"`. `recreateNote` confere `exists` antes, grava `""` pelo `storage.writeText` só se não existir, atualiza `entries`, `linkIndex` e o registro, e emite o evento de criação que o editor já trata. Exportar `followLink`, `recreateNote` e `FollowOutcome` pelo `src/features/vault/index.ts`
- [X] T024 [US1] Em `src/features/editor/note.store.ts`, mudar a assinatura para `open(path, options?: { heading?: string })` (research R8): guarda `pendingHeading` e a limpa depois de aplicada. A gravação da nota atual antes de trocar (FR-012) continua como na 001
- [X] T025 [US1] Criar `src/features/editor/model/editor.links.ts` (research R2, R3, R9):
  - `linkContext` (`Facet` ou `StateField`) com `resolve(occurrence) → LinkTarget`, `from` (nota do documento) e `onFollow(occurrence, from)`;
  - efeito `linkContextChanged` que força o recálculo;
  - `ViewPlugin` que usa `parseLinks` só nas linhas visíveis (`view.visibleRanges`) e cria `Decoration.mark` com as classes `cm-link-valid`, `cm-link-pending`, `cm-link-broken`, `cm-link-ambiguous` e `cm-link-file` e o atributo `title` com a dica da tabela de [contracts/ui.md](./contracts/ui.md), trocando "Ctrl" por "Cmd" no macOS; recalcula em `docChanged`, `viewportChanged` e `linkContextChanged`;
  - `EditorView.domEventHandlers({ mousedown })`: com `ctrlKey` (ou `metaKey` no macOS), acha a posição por `view.posAtCoords`, acha o link nela e chama `onFollow`, com `preventDefault`; clique simples não faz nada além do padrão;
  - `keymap` com `Prec.high` e `Mod-Enter`: se o cursor está num link, chama `onFollow` e devolve `true`; senão devolve `false`;
  - tema só com tokens, pela tabela de research R2: válido com `var(--foreground)` e sublinhado contínuo em `var(--brand)`; pendente com `var(--muted-foreground)` e sublinhado tracejado; quebrado com `var(--destructive)` e tachado; ambíguo com `var(--foreground)` e sublinhado ondulado em `var(--brand)`; arquivo com `var(--foreground)` e sublinhado pontilhado. `--brand` nunca como cor de texto.
- [X] T026 [US1] Em `src/features/editor/components/note-editor.tsx`:
  - acrescentar a extensão do T025 com `resolve` montado a partir de `useVaultStore` (`linkIndex`, `entries`, `deleted`);
  - como o `linkIndex` é alterado no lugar, assinar `entries` e `deleted` no `useVaultStore` e despachar `linkContextChanged` quando algum mudar;
  - receber `onFollowLink(link, from)` por prop;
  - ao carregar uma nota com `pendingHeading`, achar a seção com `findSection` e pôr o cursor no início do título com `scrollIntoView`; seção inexistente abre no início.
- [X] T027 [P] [US1] Em `src/shared/components/app-confirm.tsx`, adicionar a prop `tone?: "destructive" | "default"` (padrão `"destructive"`): com `"default"`, o `AlertDialogAction` usa a variante padrão do `Button`. O foco inicial continua em "Cancelar" (LAY-04). Conferir que os usos existentes continuam iguais
- [X] T028 [US1] Em `src/app/workspace.tsx`, passar `onFollowLink` ao `NoteEditor`, que chama `followLink` e trata o resultado ([contracts/ui.md](./contracts/ui.md) "Seguir link: respostas da interface"):
  - `open` → `noteStore.open(path, { heading })`;
  - `broken` → `app-confirm` com `tone="default"`, título "“{nome}” foi excluída", descrição "A nota pode ser restaurada pela lixeira do sistema, ou recriada vazia.", ação "Recriar nota" (chama `recreateNote` e abre) e "Cancelar";
  - `unsupported` → `toast.info` "Abrir canvas ainda não está disponível." para canvas e "Abrir este tipo de arquivo ainda não está disponível." para o resto.
- [X] T029 [US1] Atualizar os READMEs:
  - `src/features/links/README.md`: RN-LINK-002 (estados do link), `resolveLinkTarget` e o registro de notas excluídas;
  - `src/features/editor/README.md`: `Ctrl`/`Cmd`+clique e `Ctrl`/`Cmd`+`Enter` para seguir link, e a exceção LAY-07 ampliada ao destaque dos links;
  - `src/features/vault/README.md`: `followLink`, `recreateNote` e o `.devnotes/deleted-notes.json`.

**Checkpoint**: US1 funciona sozinha, com T019–T021 verdes e os passos 1, 2, 4, 5 e 11 do quickstart §4 ok em `pnpm tauri dev`

---

## Phase 4: User Story 2 - Criar nota a partir de link pendente (Priority: P1)

**Goal**: seguir um link pendente cria a nota (na pasta do link ou na pasta da nota atual) e a abre; nome inválido não cria nada

**Independent Test**: escrever um link para um nome que não existe, seguir o link e conferir que o arquivo foi criado no disco e aberto no editor (spec, US2)

### Tests for User Story 2 ⚠️

- [X] T030 [P] [US2] Em `src/features/vault/tests/vault-follow.test.ts`, adicionar:
  - **CA-LINK-001-01**: `[[ideia nova]]` em `infra` cria `ideia nova.md` vazia e devolve `{ type: "open", path: "ideia nova.md", created: true }`;
  - **CA-LINK-001-02**: `[[runbooks/rollback]]` sem a pasta `runbooks/` cria a pasta e a nota, e as duas entram em `entries`;
  - **CA-LINK-001-03**: `[[a:b]]` devolve `{ type: "invalid", reason }` com o motivo de `validateName` em português e não grava nada;
  - **CA-LINK-001-04**: `[[ideia nova]]` em `backend/infra` cria `backend/ideia nova.md`;
  - `[[Ideia Nova]]` com `ideia nova` existente abre a existente, sem criar;
  - a nota criada sai do registro de excluídas, se estava nele;
  - se o arquivo passar a existir entre a resolução e a gravação, não sobrescreve e só abre (princípio II);
  - link pendente com `from` numa nota incorporada (`backend/checklist.md`) cria a nota na pasta dela.
- [X] T031 [P] [US2] Em `src/app/tests/workspace-links.test.tsx`, adicionar: **CA-LINK-001-01** com `Mod-Enter` em `[[ideia nova]]`, o arquivo existe no adapter, o editor mostra a nota nova e aparece o toast "Nota “ideia nova” criada em raiz."; ao voltar a `infra`, o link aparece como válido; **CA-LINK-001-03** com `[[a:b]]` aparece o toast "Não foi possível criar a nota: {motivo}." e nada é criado

### Implementation for User Story 2

- [X] T032 [US2] Em `followLink` de `src/features/vault/vault.store.ts`, implementar o ramo `pending` (FR-007, FR-009, data-model "Caminho de criação do pendente"): validar cada segmento do caminho de criação com `validateName` e devolver `invalid` com o primeiro motivo; senão, conferir `exists`, gravar `""` com `storage.writeText` (que cria as pastas que faltam) só se não existir, acrescentar a `entries` a nota e as pastas novas (com `modifiedAt`), atualizar `linkIndex` e o registro, e devolver `open` com `created: true`
- [X] T033 [US2] Em `src/app/workspace.tsx`, tratar `invalid` com `toast.error("Não foi possível criar a nota: {motivo}.")` e `open` com `created` com `toast.success("Nota “{nome}” criada em {pasta}.")`, usando "raiz" quando a pasta for a raiz
- [X] T034 [US2] Atualizar `src/features/vault/README.md` com a RN-LINK-001 e onde nasce a nota do link pendente

**Checkpoint**: T030–T031 verdes; passo 3 do quickstart §4 ok

---

## Phase 5: User Story 3 - Autocompletar links ao escrever (Priority: P2)

**Goal**: `[[` e `![[` abrem sugestões ordenadas; a escolha insere o nome, ou `pasta/nome` quando o nome é repetido

**Independent Test**: num vault com `backend/api`, `frontend/api` e `deploy`, digitar `[[ap`, escolher `backend/api` e conferir o texto inserido (spec, US3)

### Tests for User Story 3 ⚠️

- [X] T035 [P] [US3] Escrever `src/features/links/tests/links-suggest.test.ts` com `suggestLinks` (data-model "LinkSuggestion"):
  - **CA-LINK-005-04**: com `api` (editada ontem), `api-gateway` (hoje), `rapid-api` e `backend/servicos/leia-me`, a query `api` devolve `api-gateway`, `api`, `rapid-api` nessa ordem, sem `leia-me`;
  - grupo 3: a query `servicos` acha `backend/servicos/leia-me` pela pasta, depois das que casam pelo nome;
  - sem maiúsculas nem acentos: `configuracao` acha `configuração`, `API` acha `api`;
  - `insert` é o nome quando ele é único entre as notas e `pasta/nome` sem `.md` quando é repetido (**CA-LINK-005-01/02** no modelo);
  - `name` e `folder` preenchidos (FR-014); só notas, nunca canvas nem outros arquivos;
  - no máximo 50 sugestões por padrão; query vazia devolve as mais recentes.
- [X] T036 [P] [US3] Escrever `src/features/editor/tests/editor-complete.test.tsx`, abrindo a lista com `startCompletion` e lendo `currentCompletions`/o DOM da lista:
  - **CA-LINK-005-01**: digitar `[[depl` e escolher `deploy` deixa o texto `[[deploy]]`;
  - **CA-LINK-005-02**: `[[api` e escolher a de `backend/` deixa `[[backend/api]]`;
  - **CA-LINK-005-03**: `[[api` mostra as duas notas, cada uma com a pasta visível;
  - **CA-LINK-005-05**: digitar `[[ideia nova]]` sem escolher mantém o texto e o link fica pendente;
  - **US3-6**: seta para baixo e `Enter` escolhem; `Tab` escolhe; `Esc` fecha sem inserir nada;
  - `![[chec` também sugere e mantém o `!`;
  - com `]]` já digitado depois do cursor, a escolha não duplica os colchetes;
  - dentro de cerca ``` não abre sugestão;
  - sem correspondência, a lista mostra "Nenhuma nota encontrada. Continue digitando para criar um link novo." e `Enter` não insere nada.

### Implementation for User Story 3

- [X] T037 [US3] Implementar `src/features/links/model/links.suggest.ts` com `suggestLinks(query, notes: VaultEntry[], limit = 50): LinkSuggestion[]` e o tipo `LinkSuggestion` (`path`, `name`, `folder`, `insert`, `group`, `modifiedAt`), com a comparação `normalize("NFD")` sem diacríticos e depois `nameKey` (research R5). Exportar `suggestLinks` e `LinkSuggestion` pelo `src/features/links/index.ts`. **Esperado**: T035 passa
- [X] T038 [US3] Criar `src/features/editor/model/editor.complete.ts` com a fonte de sugestões do `@codemirror/autocomplete` (consultar a documentação da 6.20.3 antes):
  - ativada quando o texto antes do cursor casa com `!?\[\[` seguido de texto sem `]`, `|`, `#` nem quebra de linha, e só fora de código;
  - `validFor` para filtrar sem reabrir;
  - cada opção com `label` = nome, `detail` = pasta ("raiz" na raiz) e `apply` que insere `insert` + `]]`, pulando os `]]` já presentes depois do cursor;
  - lista vazia com a mensagem de [contracts/ui.md](./contracts/ui.md) "Autocomplete", sem inserir nada ao confirmar;
  - tema da lista (`.cm-tooltip-autocomplete`) só com tokens (`--popover`, `--popover-foreground`, `--accent`, `--muted-foreground`).
- [X] T039 [US3] Em `src/features/editor/components/note-editor.tsx`, acrescentar `autocompletion({ override: [linkCompletionSource] })` com as notas vindas de `useVaultStore` e o `completionKeymap` antes do `defaultKeymap`, com `Tab` aceitando a sugestão. Não ativar `closeBrackets`. Conferir que o `Mod-Enter` do T025 continua funcionando com a lista fechada
- [X] T040 [US3] Atualizar `src/features/editor/README.md` (autocomplete de links, teclas) e `src/features/links/README.md` (RN-LINK-004/005 no `suggestLinks`)

**Checkpoint**: T035–T036 verdes; passo 7 do quickstart §4 ok

---

## Phase 6: User Story 4 - Incorporar uma nota em outra (Priority: P2)

**Goal**: `![[nota]]` e `![[nota#Seção]]` mostram o conteúdo num bloco somente leitura abaixo da linha, que acompanha a original, com ciclo interrompido e profundidade limitada

**Independent Test**: incorporar uma nota em outra, alterar a original e conferir que a incorporação mostra a alteração (spec, US4)

### Tests for User Story 4 ⚠️

- [X] T041 [P] [US4] Escrever `src/features/links/tests/links-embeds.test.ts` com `embedState` (data-model "EmbedNode"):
  - `circular` quando o destino está em `chain`, inclusive a própria nota (`runbook` em `runbook`) e A↔B;
  - `too-deep` com `depth > 5`;
  - `not-found` para destino `pending` ou `broken`;
  - `unsupported` para `file`;
  - `ambiguous` para destino `ambiguous` (`![[util]]` com duas notas `util`), com as candidatas;
  - `section-not-found` quando `heading` não existe; `content` com só a seção quando existe (usa `findSection`); `#^bloco` mostra a nota inteira;
  - `empty` para nota vazia ou só com espaços.
- [X] T042 [P] [US4] Escrever `src/features/editor/tests/editor-embeds.test.tsx`, montando o `NoteEditor` com `runbook` aberta:
  - **CA-EMBED-001-01**: o conteúdo de `checklist` aparece num bloco logo depois da linha `![[checklist]]`, que continua no documento;
  - **CA-EMBED-001-02**: `simulateExternal` `modified` em `checklist.md` atualiza o bloco sem reabrir `runbook`; alteração feita pelo app (reescrita ao renomear, evento `rewritten`) também;
  - **CA-EMBED-001-03**: `![[checklist#Antes do deploy]]` mostra só aquela seção;
  - **CA-EMBED-002-01**: excluir `checklist` mostra "Nota não encontrada: checklist" e o texto `![[checklist]]` continua; criar `checklist` de novo volta a mostrar o conteúdo (FR-021);
  - **CA-EMBED-003-01**: abrir `a` (que incorpora `b`, que incorpora `a`) mostra "Incorporação circular: a já aparece acima" e o teste termina (sem laço);
  - **US4-6**: editar `runbook` e gravar deixa no arquivo só o texto digitado com `![[checklist]]`, e `checklist.md` fica igual byte a byte;
  - o botão "Abrir checklist" (nome acessível, CMP-10) chama `onFollowLink` para `checklist`;
  - `Mod-Enter` num link dentro do bloco chama `onFollowLink` com `from` = nota incorporada, e o texto do bloco não é editável;
  - A→B→C encadeadas aparecem as três; a partir do 6º nível, só o link;
  - nota vazia mostra "{nome} está vazia"; `![[mapa.canvas]]` mostra "Incorporar este tipo de arquivo ainda não está disponível"; `![[util]]` com duas notas `util` mostra "Mais de uma nota chamada “util”; indique a pasta" e não carrega nenhuma das duas.

### Implementation for User Story 4

- [X] T043 [US4] Implementar `src/features/links/model/links.embeds.ts` com `embedState({ target, chain, depth, text, heading }): EmbedNode["state"]` e o tipo `EmbedState`, função pura que concentra a regra de data-model "EmbedNode" (research R1). Exportar pelo `src/features/links/index.ts` e acrescentar a assinatura em [contracts/links-module.md](./contracts/links-module.md). **Esperado**: T041 passa
- [X] T044 [P] [US4] Criar `src/features/editor/components/embed-block.tsx` com a moldura, o cabeçalho e as mensagens de [contracts/ui.md](./contracts/ui.md) "Bloco de incorporação": moldura com `border` e `muted` e recuo à esquerda; cabeçalho com `FileText`, nome (e "› {seção}") e `Button` `variant="ghost"` `size="sm"` "Abrir" com `aria-label` "Abrir {nome}"; estados com ícone + texto (`FileX`, `FileSearch`, `Repeat`, `File`, `FileQuestion` e `Files` para o ambíguo, CMP-08); `Skeleton` de três linhas com `aria-busy` enquanto carrega; um `ref` de contêiner para o corpo. Sem cor pronta (COR-01)
- [X] T045 [US4] Criar `src/features/editor/model/editor.embeds.ts` (research R6):
  - `StateField` que, a cada `docChanged` ou `linkContextChanged`, cria um `Decoration.widget({ block: true, side: 1 })` no fim de cada linha com `![[...]]` fora de código (via `parseLinks`) — decoração de bloco não pode vir de `ViewPlugin`;
  - `WidgetType` com `eq` por destino + seção + cadeia e `ignoreEvent() { return true }`, para cliques no bloco não moverem o cursor da nota principal;
  - `toDOM` monta uma raiz React com o `EmbedBlock` do T044 e, no estado `content`, um `EditorView` aninhado com `EditorState.readOnly` e `EditorView.editable.of(false)`, com as extensões de links (T025, `from` = nota incorporada) e de incorporação (profundidade + 1, cadeia + nota atual);
  - lê o conteúdo por `useVaultStore.getState().vault.storage.readText` e relê nos eventos `external`, `rewritten`, `moved` e `removed` do caminho do destino, assinados com `onEntryEvent` de `@/features/vault`;
  - `destroy` desmonta a raiz React, destrói o editor aninhado e cancela a assinatura.
- [X] T046 [US4] Em `src/features/editor/components/note-editor.tsx`, acrescentar a extensão do T045 com profundidade 1 e cadeia `[path da nota aberta]`, e o "Abrir" do bloco chamando o mesmo `onFollowLink`. Conferir que abrir, rolar e fechar `runbook` não chama `writeText` (FR-024, SC-007)
- [X] T047 [US4] Atualizar `src/features/editor/README.md` (bloco de incorporação, editor aninhado somente leitura, raiz React dentro do widget e o motivo em plan "Complexity Tracking") e `src/features/links/README.md` (RN-EMBED-001..003)

**Checkpoint**: T041–T042 verdes; passos 8–10 do quickstart §4 ok

---

## Phase 7: User Story 5 - Conviver com nomes repetidos (Priority: P3)

**Goal**: link ambíguo tem aparência própria e, ao ser seguido, pede a escolha entre as notas

**Independent Test**: num vault com duas notas `util`, escrever `[[util]]`, seguir o link e conferir que o app pede a escolha (spec, US5)

### Tests for User Story 5 ⚠️

- [X] T048 [P] [US5] Em `src/features/editor/tests/editor-links.test.tsx`, adicionar **CA-LINK-003-01**: com `backend/util` e `frontend/util`, `[[util]]` tem classe e `title` de ambíguo, diferentes de válido e de pendente; e a regressão da **CA-LINK-006-01**: depois de renomear `frontend/util` para `api` pelo `vault.store`, os links antigos viram `[[backend/api]]` no editor e aparecem como válidos, não ambíguos. Conferir que o caso CA-LINK-006-01 de `src/features/links/tests/links-rename.test.ts` (001) continua existindo e verde
- [X] T049 [P] [US5] Em `src/features/vault/tests/vault-follow.test.ts`, adicionar **CA-LINK-003-02** no nível da store (a parte do diálogo fica no T050): `[[util]]` devolve `{ type: "choose", candidates: ["backend/util.md", "frontend/util.md"] }` e não cria nem abre nada
- [X] T050 [P] [US5] Em `src/app/tests/workspace-links.test.tsx`, adicionar **CA-LINK-003-02**: seguir `[[util]]` abre o diálogo "Qual nota abrir?" com a descrição "Existe mais de uma nota chamada “util”." e as duas notas com a pasta; nada abre antes da escolha; escolher `frontend/util` abre essa nota; `Esc` fecha sem abrir nada

### Implementation for User Story 5

- [X] T051 [US5] Em `followLink` de `src/features/vault/vault.store.ts`, implementar o ramo `ambiguous` → `{ type: "choose", candidates }`
- [X] T052 [P] [US5] Criar `src/features/links/components/link-choice-dialog.tsx` com `Dialog` + `Command`, no padrão de `src/features/vault/components/vault-move-dialog.tsx`: props `open`, `name`, `candidates`, `onChoose(path)` e `onCancel`; título "Qual nota abrir?", descrição "Existe mais de uma nota chamada “{nome}”.", um item por candidata com o nome e a pasta ("raiz" na raiz). Exportar `LinkChoiceDialog` pelo `src/features/links/index.ts`
- [X] T053 [US5] Em `src/app/workspace.tsx`, tratar `choose` abrindo o `LinkChoiceDialog`; a escolha chama `noteStore.open(path, { heading })` com a seção do link original
- [X] T054 [US5] Atualizar `src/features/links/README.md` com a RN-LINK-003 (link ambíguo, exibido e seguido com escolha, nunca reescrito sozinho)

**Checkpoint**: T048–T050 verdes; passos 1 e 6 do quickstart §4 ok; todas as histórias funcionam

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: jornada "linkar" no navegador, desempenho, documentação e revisão

- [X] T055 [P] Escrever `e2e/links.spec.ts` (Playwright no `pnpm dev:mock`, TST-07) com as jornadas de [quickstart.md](./quickstart.md) §3:
  - `Ctrl`+clique em `[[ideia nova]]` cria e abre a nota na pasta da nota atual (jornada "linkar" da constituição);
  - digitar `[[api` com `backend/api` e `frontend/api`, escolher a de `backend/` e ver `[[backend/api]]` no texto;
  - `runbook` mostra o conteúdo de `checklist`; alterar `checklist` por `window.__devnotesMock.simulateExternal` faz o bloco mudar;
  - `[[util]]` abre o diálogo de escolha.
- [X] T056 [P] Em `src/features/vault/tests/vault-performance.test.ts`, com o `createSyntheticVault` de 5.000 notas, acrescentar: `suggestLinks` para cada prefixo de `"alvo"` termina em menos de 300 ms por chamada (SC-001) e `resolveLinkTarget` de todos os links de uma nota com 200 links termina bem abaixo de 1 s. Importar só pelos `index.ts` (NOM-03)
- [ ] T057 Medir no app desktop, com o vault sintético gravado em disco: sugestões por tecla (≤ 0,3 s, SC-001), `Ctrl`+clique em pendente até a nota aberta (≤ 1 s, SC-003), alteração da original no bloco (≤ 2 s, SC-004), nota com 20 incorporações aberta (≤ 1 s, SC-005) e estado do link depois de excluir ou criar o destino (≤ 2 s, SC-006). Registrar os números e a máquina usada em `specs/002-links-incorporacao/quickstart.md` §5
- [X] T058 [P] Atualizar `docs/arquitetura.md`: `AppDataStore` e `VaultEntry.modifiedAt` na seção de `shared/vault`, `.devnotes/deleted-notes.json` como primeiro dado do app no vault e os comandos `vault_app_data_read`/`vault_app_data_write` na §7. Em `specs/001-vault-notas/contracts/shared-vault.md`, acrescentar uma linha apontando para as mudanças de [contracts/shared-vault.md](./contracts/shared-vault.md). Atualizar `README.md` se ele listar as funções do app
- [X] T059 Rodar a skill `app-review-standards` sobre todas as mudanças e corrigir tudo o que for "Bloqueia" e "Deveria corrigir"
- [ ] T060 Rodar `pnpm verify` e `pnpm test:e2e`, e depois o roteiro manual de [quickstart.md](./quickstart.md) §4 no Windows, com o passo 12 (registro gravado em `.devnotes/`, pasta começada por ponto) no macOS e no Linux (research R4). Registrar no fim do quickstart o que foi verificado em cada sistema

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup e **bloqueia todas as histórias**.
- **US1 (Phase 3)**: depende da Foundational.
- **US2 (Phase 4)**: depende da US1 (`followLink`, `onFollowLink` no editor e no `workspace`).
- **US3 (Phase 5)**: depende só da Foundational (`modifiedAt`, `namesake`); pode andar junto com a US1.
- **US4 (Phase 6)**: depende da US1 (extensão de links reaproveitada no editor aninhado).
- **US5 (Phase 7)**: depende da US1 (`followLink` e a classe de ambíguo).
- **Polish (Phase 8)**: depende das histórias desejadas.

### User Story Dependencies

```text
Setup → Foundational ─┬─→ US1 ─┬─→ US2
                      │        ├─→ US4
                      │        └─→ US5
                      └─→ US3
```

- **US1 (P1)**: nenhuma outra história.
- **US2 (P1)**: US1.
- **US3 (P2)**: nenhuma; só toca `note-editor.tsx` junto com as outras (combinar a ordem dos merges).
- **US4 (P2)**: US1.
- **US5 (P3)**: US1. Independente de US2, US3 e US4.

### Within Each User Story

- Testes escritos e falhando antes da implementação.
- Modelo puro (`features/links/model/`) antes das stores, stores antes das extensões do editor e
  do `workspace`.
- A história fica pronta, com `pnpm verify` verde, antes da próxima prioridade.

### Arquivos disputados

- `src/features/vault/vault.store.ts`: T017, T022, T023, T032 e T051, nessa ordem.
- `src/features/editor/components/note-editor.tsx`: T026, T039 e T046.
- `src/app/workspace.tsx`: T028, T033 e T053.
- `src/features/links/index.ts`: T016, T037, T043 e T052.
- Os testes `vault-follow.test.ts`, `workspace-links.test.tsx` e `editor-links.test.tsx` recebem
  casos de mais de uma história; quem vier depois só acrescenta.

### Parallel Opportunities

- Setup: T001, T002 e T003 juntos.
- Foundational:
  - o Rust (T007, T008) anda em paralelo com o TypeScript (T004–T006);
  - T010, T011, T013, T015 e T018 são arquivos independentes e rodam juntos.
- US1: os testes T019–T021 juntos; T027 junto com T022–T025.
- Depois da US1, **US2, US4 e US5 podem andar em paralelo**, e a US3 já pode andar desde o fim da
  Foundational, respeitando os arquivos disputados acima.
- Polish: T055, T056 e T058 juntos.

---

## Parallel Example: Foundational

```bash
# Rust e TypeScript juntos:
Task: "T007 modifiedAt e vault_app_data_* em src-tauri/src/vault.rs"
Task: "T004–T006 modifiedAt e AppDataStore em src/shared/vault/"

# Núcleo puro dos links juntos:
Task: "T010 namesake em links.index.ts"
Task: "T011 links-deleted.test.ts"
Task: "T013 links-target.test.ts"
Task: "T015 links.sections.ts + teste"
Task: "T018 seed em src/mocks/demo-vault.ts"
```

## Parallel Example: User Story 1

```bash
# Testes da US1 juntos:
Task: "T019 editor-links.test.tsx em src/features/editor/tests/"
Task: "T020 vault-follow.test.ts em src/features/vault/tests/"
Task: "T021 workspace-links.test.tsx em src/app/tests/"

# Peça compartilhada em paralelo com a store:
Task: "T027 tone em app-confirm.tsx"
```

## Parallel Example: depois da US1

```bash
Task: "T030–T034 link pendente (US2)"
Task: "T041–T047 incorporação (US4)"
Task: "T048–T054 link ambíguo (US5)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup.
2. Phase 2: Foundational (`modifiedAt`, `AppDataStore`, núcleo dos links). **Crítico.**
3. Phase 3: US1.
4. **Parar e validar**: passos 1, 2, 4, 5 e 11 do quickstart §4 em `pnpm tauri dev`.

O resultado é um vault navegável: links destacados pelo estado, seguidos com `Ctrl`+clique, e
links quebrados que sobrevivem ao reabrir o app.

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. US1 → MVP (navegar pelos links).
3. US2 → criar nota pelo link pendente (fecha as duas histórias P1).
4. US3 → autocomplete.
5. US4 → incorporação.
6. US5 → link ambíguo.
7. Polish → e2e "linkar", desempenho, docs, revisão, três sistemas.

### Parallel Team Strategy

- Na Foundational: uma pessoa no Rust (T007–T009), outra em `shared/vault` (T004–T006) e outra
  no núcleo dos links (T010–T016).
- Depois da Foundational: pessoa A na US1 e depois na US2; pessoa B na US3 e depois na US4;
  pessoa C na US5 quando a US1 terminar.

---

## Notes

- 60 tarefas. As marcadas [P] tocam arquivos diferentes e não dependem de tarefas incompletas.
- O rótulo [USn] liga a tarefa à história da spec para rastreabilidade.
- Faça commit a cada tarefa ou grupo lógico.
- Evite: tarefas vagas, dois agentes no mesmo arquivo, exportar pelo `index.ts` o que nenhum
  módulo de fora usa, criar composições `app-*` sem segundo uso (NOM-05, NOM-06, COD-04).
