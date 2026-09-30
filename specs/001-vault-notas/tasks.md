---

description: "Lista de tarefas da feature 001 — Vault e Notas"
---

# Tasks: Vault e Notas

**Input**: Design documents from `/specs/001-vault-notas/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/shared-vault.md](./contracts/shared-vault.md),
[contracts/ui.md](./contracts/ui.md), [quickstart.md](./quickstart.md)

**Tests**: obrigatórios. A constituição ("Fluxo de Desenvolvimento e Portões de Qualidade") exige
que todo critério `CA-*` vire teste Vitest sobre o adapter em memória e que as jornadas
principais tenham Playwright. Nesta lista os testes vêm antes da implementação: escreva-os,
confirme que falham e só então implemente.

**Organization**: tarefas agrupadas por história de usuário, para que cada uma possa ser
implementada e testada de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história da spec (US1..US5)
- Todo caminho é relativo à raiz do repositório

## Regras que valem para toda tarefa

- Nomes de arquivo em minúsculas com hífen ou `assunto.tipo.ts` (NOM-01, NOM-04); exportação
  nomeada (NOM-02); `@/` fora do módulo, relativo dentro (NOM-03).
- Só crie o arquivo quando ele for usado (NOM-05). O `index.ts` exporta só o que outro módulo usa
  (NOM-06).
- Texto para o usuário em português (IDI-01); código e comentários em inglês (IDI-02, COD-02).
- UI só com shadcn instalado via `pnpm exec shadcn add` depois de consultar o MCP do shadcn
  (CMP-01, LAY-08). Composição por `render`, nunca `asChild` (CMP-03). Nada de cor pronta nem
  medida entre colchetes (COR-01, COR-03).
- Features nunca importam `@tauri-apps/*` (princípio III). Tudo passa por `@/shared/vault`.
- Nome de teste cita o ID do critério, ex.: `it("CA-NOTA-004-01 — renomear atualiza links", ...)`.
- Rode `pnpm verify` ao fim de cada fase.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: o projeto nasce do react-standards-template, adaptado a app desktop (research R1, R2)

- [ ] T001 Importar o `react-standards-template` para a raiz do repositório. Clonar `https://github.com/thiagocorreanet/react-standards-template` (commit `4d2ad32`) num diretório temporário do scratchpad e copiar tudo, menos `.git/`, sem sobrescrever `docs/arquitetura.md`, `docs/regras-de-negocio.md`, `docs/brand.md`, `specs/`, `.specify/` nem `.claude/skills/speckit-*`. Trazer `.claude/skills/app-review-standards/`, `.mcp.json`, `.node-version`, `biome.json`, `components.json`, `vite.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`, `pnpm-workspace.yaml`, `package.json`, `CLAUDE.md`, `docs/standards.md`, `docs/development.md`, `docs/decisions/`, `src/`, `e2e/` e `public/`. Não trazer `docs/architecture.md` (substituído por `docs/arquitetura.md`) nem `docs/api-contract.md`. Guardar o `README.md` atual como está (é reescrito em T089)
- [ ] T002 Remover os módulos do template que não se aplicam: `src/features/auth/`, `src/features/items/`, `src/routes/`, `src/router.tsx`, `src/routeTree.gen.ts`, `src/shared/api/`, `src/mocks/handlers.ts`, `src/mocks/browser.ts`, `src/shared/components/app-table.tsx`, `src/shared/components/app-table.test.tsx`, `src/shared/components/request-error.tsx`, `src/config/navigation.ts`, `.env.example`, `.env.mock` (se só tiverem variáveis de API), `scripts/create-project.mjs` e `scripts/create-project.test.mjs`. Remover as referências a eles em `src/features/README.md`
- [ ] T003 Ajustar `package.json`: remover `@tanstack/react-router`, `@tanstack/react-query`, `@tanstack/react-table`, `ky`, `msw` e plugins do TanStack Router no `vite.config.ts`; remover o script `test:generator`; adicionar `"tauri": "tauri"` e `"test:rust": "cargo test --manifest-path src-tauri/Cargo.toml"`; definir `"verify": "pnpm check && pnpm typecheck && pnpm test && pnpm test:rust && pnpm build"`. Manter o `packageManager` `pnpm@10.33.0` e o `engines.node` `>=24 <25`. Versões sempre exatas, sem `^` (FER-02)
- [ ] T004 Adicionar dependências com versão exata (FER-02): `@tauri-apps/api@2.12.0`, `@tauri-apps/plugin-fs@2.6.0`, `@tauri-apps/plugin-dialog@2.8.0`, `@tauri-apps/cli@2.12.0` (dev), `zustand`, `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/lang-markdown`, `@fontsource-variable/inter` e `@fontsource-variable/jetbrains-mono` (as últimas estáveis, fixadas sem `^`) em `package.json`. Remover a fonte Geist, se estiver instalada
- [ ] T005 [P] Adaptar `docs/standards.md` (research R1): remover as seções `ROT-*`, `API-*`, `SEG-*` e as regras `EST-01`, `EST-04`, `CMP-05`, `CMP-06`, `TST-06`, `AMB-04` e `FER-03`; mudar o local do `<Toaster>` da CMP-09 para `src/app/root.tsx`; na EST-03, registrar a exceção do Zustand para estado global de workspace com referência ao ADR-006; adicionar as regras `LAY-01..09` copiadas de `docs/arquitetura.md` §6.3; atualizar a lista de "regras que quebram em silêncio" do `CLAUDE.md`, se ela citar regras removidas
- [ ] T006 [P] Substituir `src/styles.css` pelo bloco completo de `docs/brand.md` §5 (imports das fontes, `:root`, `.dark`, `@theme inline` com `--brand`), mantendo os demais imports que o template já tinha e não conflitam
- [ ] T007 Criar o núcleo Tauri em `src-tauri/`: `Cargo.toml` com `tauri = "=2.12.0"`, `tauri-plugin-fs = { version = "=2.6.0", features = ["watch"] }`, `tauri-plugin-dialog = "=2.8.0"`, `trash = "=5.2.9"`, `serde`, `serde_json`; `rust-version = "1.90"`; `src-tauri/src/main.rs` chamando `dev_notes_lib::run()`; `src-tauri/src/lib.rs` registrando `tauri_plugin_fs::init()` e `tauri_plugin_dialog::init()`; `src-tauri/tauri.conf.json` com `productName` "Dev Notes", `identifier` "dev.devnotes.app", `build.devUrl` `http://localhost:3000`, `build.frontendDist` `../dist`, `beforeDevCommand` `pnpm dev`, `beforeBuildCommand` `pnpm build`
- [ ] T008 Criar `src-tauri/capabilities/default.json` para a janela `main` com exatamente: `core:default`, `core:window:allow-close`, `core:window:allow-destroy`, `fs:allow-read-text-file`, `fs:allow-write-text-file`, `fs:allow-mkdir`, `fs:allow-rename`, `fs:allow-exists`, `fs:allow-stat`, `fs:allow-watch`, `fs:allow-unwatch` e os comandos próprios `vault_pick`, `vault_restore`, `vault_scan`, `vault_read_notes`, `vault_trash`. Não incluir `fs:allow-remove`, `dialog:allow-open` (o seletor roda no Rust, em `vault_pick`) nem nenhum `fs:scope` estático (research R3)
- [ ] T009 [P] Em `biome.json`, adicionar `noRestrictedImports` proibindo `@tauri-apps/*` em `src/**`, com um `override` que libera `src/shared/vault/adapters/tauri/**` (princípio III)
- [ ] T010 Criar `src/app/root.tsx` com `ThemeProvider` (do template) envolvendo `<Workspace />` e um único `<Toaster theme={theme} richColors position="bottom-right" />` importado de `sonner` (CMP-09, COR-04); reescrever `src/main.tsx` para chamar `initializeTheme()` e renderizar `<Root />`, sem QueryClient, Router nem MSW. Criar `src/app/workspace.tsx` provisório que renderiza só um título "Dev Notes" (substituído em T052)
- [ ] T011 [P] Adicionar `autosaveDelayMs: 1000` em `src/config/app.ts` e ajustar `name` para "Dev Notes" e o idioma para `pt-BR`
- [ ] T012 [P] Escrever em `docs/decisions/` os ADRs 001 (Tauri 2), 004 (CodeMirror 6), 006 (Zustand), 008 (`shared/vault` com adapters Tauri e memória) e 011 (remover TanStack Router, Query e Table) com status **Aceito**, no formato e na numeração já usados pelos arquivos do template nessa pasta; cada ADR cita a decisão e o tradeoff de `docs/arquitetura.md` §11 e o item correspondente de `specs/001-vault-notas/research.md`
- [ ] T013 [P] Atualizar `CLAUDE.md`: apontar para `.specify/memory/constitution.md`, `docs/arquitetura.md`, `docs/regras-de-negocio.md` e `docs/brand.md`; trocar a tabela "Leia antes de agir" para o novo contexto (sem rotas/API); manter `pnpm verify` como portão
- [ ] T014 Rodar `pnpm install` e `pnpm verify`; corrigir o que quebrar pelas remoções. **Esperado**: verde, com o app abrindo em `pnpm dev` e em `pnpm tauri dev`

**Checkpoint**: o projeto compila e abre uma janela vazia com os tokens do `brand.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `shared/vault` (os dois adapters e a suíte de contrato) e o núcleo puro dos links, dos quais todas as histórias dependem

**⚠️ CRITICAL**: nenhuma história começa antes desta fase terminar

### Tipos e utilitários

- [ ] T015 Criar `src/shared/vault/vault.types.ts` com exatamente os tipos de [contracts/shared-vault.md](./contracts/shared-vault.md): `VaultPath`, `EntryKind` (`"folder" | "note" | "canvas" | "other"`), `VaultEntry`, `VaultRef` (`root`, `name`, `lastOpenedAt`), `VaultErrorCode` (`not-found`, `already-exists`, `invalid-name`, `permission-denied`, `trash-unavailable`, `vault-unavailable`, `io`), a classe `VaultError` (com `code` e `path?`), `ExternalChange`, `VaultSession`, `OpenVault` (inclui `onBeforeClose`), `VaultStorage` (inclui `readMany`), `FileWatcher` e `Trash`
- [ ] T016 [P] Escrever `src/shared/vault/tests/vault-paths.test.ts` cobrindo: rejeitar `..`, caminho absoluto e `\` com `invalid-name`; normalizar `a//b/` para `a/b`; `nameKey("Api")` igual a `nameKey("api")`; `nameKey` aplica NFC (`"é"` composto e decomposto são iguais); `kindOf("x.md") === "note"`, `kindOf("x.canvas") === "canvas"`
- [ ] T017 [P] Implementar `src/shared/vault/vault.paths.ts`: `normalizeVaultPath`, `joinVaultPath`, `parentOf`, `basenameOf` (sem extensão para notas), `kindOf` e `nameKey(name) = name.normalize("NFC").toLocaleLowerCase("pt-BR")` (data-model "Convenções")
- [ ] T018 [P] Implementar `src/shared/lib/hash.ts` com `sha256Hex(text: string): Promise<string>` usando `crypto.subtle.digest("SHA-256", ...)` (research R5)
- [ ] T019 [P] Escrever `src/shared/vault/tests/vault-ledger.test.ts`: uma escrita registrada com hash H faz `matches(path, H)` ser `true` dentro de 2 s e `false` depois (com timers falsos); hash diferente dá `false`; registro de remoção (`hash` vazio) casa com evento de arquivo inexistente
- [ ] T020 Implementar `src/shared/vault/vault.ledger.ts` com `record(path, hash | null)`, `matches(path, currentHash | null)` e expiração padrão de 2.000 ms (data-model "WriteLedger")

### Suíte de contrato e adapter em memória

- [ ] T021 Escrever `src/shared/vault/tests/vault-contract.test.ts` como uma função `runVaultContract(name, createSession)` parametrizada pelo adapter, cobrindo cada método de [contracts/shared-vault.md](./contracts/shared-vault.md):
  - `list()` ignora nomes iniciados por `.`;
  - `writeText` cria a pasta pai;
  - `createFolder` e `move` falham com `already-exists` inclusive por diferença só de maiúsculas;
  - `move("api.md", "API.md")` funciona;
  - `move` de pasta leva o conteúdo;
  - `readMany` devolve na ordem pedida;
  - `trash.moveToTrash` remove da listagem, e com a lixeira indisponível rejeita com `trash-unavailable` sem alterar nada;
  - `watcher.subscribe` não recebe as escritas do próprio app e recebe as externas;
  - raiz removida gera `{ kind: "removed", path: "" }` e as chamadas seguintes rejeitam com `vault-unavailable`;
  - caminho fora da raiz rejeita com `invalid-name`.

  Invocar para o adapter `memory` neste arquivo.
- [ ] T022 Implementar `src/shared/vault/adapters/memory/memory-vault.ts`: `createMemoryVaultSession(seed?: Record<VaultPath, string>)`. O `Map` guarda o conteúdo e o `VaultError` sai com os mesmos códigos do Tauri. Extras só para testes: `simulateExternal(change, content?)`, que dispara `FileWatcher` como mudança externa (`{ kind: "removed", path: "" }` simula a raiz sumindo: emite o evento e faz as chamadas seguintes rejeitarem com `vault-unavailable`), e `trash.setAvailable(boolean)`, com `removed` para inspecionar o que foi para a lixeira. `onBeforeClose` guarda as tarefas e expõe `runBeforeClose()` para teste. Usa `vault.ledger.ts` para descartar as próprias escritas. **Esperado**: T021 passa

### Núcleo Rust

- [ ] T023 [P] Em `src-tauri/src/vault.rs`, criar o estado `VaultState { root: Mutex<Option<PathBuf>>, trash_lock: Mutex<()> }` e a função `resolve_in_vault(root: &Path, rel: &str) -> Result<PathBuf, VaultCmdError>`, que rejeita `..`, caminho absoluto e qualquer resultado canonizado fora de `root` (para destino ainda inexistente, canonizar o pai). Adicionar `#[cfg(test)]` com casos de `..`, symlink para fora e caminho válido. Mapear erros para strings iguais aos `VaultErrorCode`
- [ ] T024 Implementar em `src-tauri/src/vault.rs` os comandos `vault_pick` e `vault_restore` (research R3):
  - `vault_pick` abre o seletor de pasta pelo `tauri_plugin_dialog` (Rust), chama `app.fs_scope().allow_directory(path, true)`, grava `{ "root": "<path>", "lastOpenedAt": "<ISO>" }` em `<AppConfig>/vault.json`, guarda a raiz em `VaultState` e devolve o caminho ou `null`;
  - `vault_restore` lê esse arquivo, confere se a pasta existe, libera o escopo, guarda a raiz e devolve o caminho ou `null`.

  Registrar os dois comandos e o `VaultState` em `src-tauri/src/lib.rs`.
- [ ] T025 Implementar em `src-tauri/src/vault.rs` os comandos `vault_scan` e `vault_read_notes` (research R4):
  - `vault_scan` percorre a raiz recursivamente e devolve `[{ path, kind, name }]` com `path` relativo em `/`. Ignora qualquer segmento que comece com `.`. **Não segue nem lista links simbólicos** (research R4). `kind` é `folder`, `note` (`.md`), `canvas` (`.canvas`) ou `other`; `name` vem sem `.md` nas notas. Adicionar `cargo test` com um link simbólico para fora do vault e um link simbólico em loop, os dois fora do resultado;
  - `vault_read_notes(paths: Vec<String>)` valida cada caminho com `resolve_in_vault` e devolve `[{ path, content }]` na ordem recebida.
- [ ] T026 Implementar em `src-tauri/src/vault.rs` o comando `vault_trash(path)` (research R6):
  - valida o caminho com `resolve_in_vault` e segura o `trash_lock` durante a chamada;
  - chama `trash::delete`; no macOS, usa o método `NsFileManager` do `TrashContext`, conferindo o nome exato da API em docs.rs para a versão 5.2.9;
  - mapeia **qualquer** `trash::Error` para `trash-unavailable`, sem outra tentativa e sem exclusão definitiva;
  - devolve `not-found` se o caminho não existir.

  Registrar o comando em `lib.rs`.

### Adapter Tauri e seleção

- [ ] T027 Implementar `src/shared/vault/adapters/tauri/tauri-vault.ts`:
  - `pickFolder`, `lastOpened` e `open` usam `invoke` nos comandos de T024–T026;
  - `VaultStorage` usa `@tauri-apps/plugin-fs` (`readTextFile`, `writeTextFile`, `mkdir` com `recursive`, `rename`, `exists`) sobre caminhos absolutos montados a partir de `root`;
  - `list`, `readMany` e o `Trash` usam `invoke`;
  - `move` com a mesma `nameKey` e grafia diferente faz dois passos via `<nome>.devnotes-tmp-<id>` (research R8); com outro destino já existente, falha com `already-exists`;
  - toda escrita, movimentação e envio à lixeira registra no ledger **antes** da chamada;
  - `FileWatcher` usa `watch(root, cb, { recursive: true, delayMs: 300 })`. Para cada caminho do evento que não tenha segmento iniciado por `.`, confere com `exists` e lê o conteúdo, compara o `sha256Hex` com o ledger e emite `created`, `modified` ou `removed` só quando não casa (research R5). Se o evento indicar rescan, relista e compara com a última listagem. Se a própria raiz deixar de existir (evento na raiz ou `exists(root)` falso no rescan), emite `{ kind: "removed", path: "" }` uma única vez e para de observar ([contracts/shared-vault.md](./contracts/shared-vault.md) "FileWatcher");
  - `onBeforeClose` usa `getCurrentWindow().onCloseRequested`, que chama `preventDefault`, espera as tarefas e depois `destroy()`;
  - erros do Tauri viram `VaultError`.
- [ ] T028 Implementar `src/shared/vault/index.ts` (research R13):
  - exporta os tipos e `getVaultSession(): Promise<VaultSession>`;
  - usa o adapter de memória com `src/mocks/demo-vault.ts` **somente** quando `import.meta.env.MODE === "mock"`, condição que o Vite resolve no build e que elimina o `import()` do bundle de produção;
  - em qualquer outro modo, usa o adapter Tauri (também por `import()` dinâmico); se `isTauri()` for `false`, rejeita com `VaultError("vault-unavailable")`;
  - não usar `!isTauri()` para escolher o adapter de memória: isso deixaria o adapter em `dist/` e quebraria o T030;
  - o Vitest não passa por aqui: os testes importam `createMemoryVaultSession` direto;
  - exporta também `vault.paths.ts`.
- [ ] T029 [P] Criar `src/mocks/demo-vault.ts` com o seed do vault de teste do [quickstart.md](./quickstart.md) §4:
  - `infra.md` com `[[deploy]]` e `[[backend/api]]`;
  - `deploy.md`;
  - `mapa.canvas` com um nó `{"id":"n1","type":"file","file":"deploy.md","x":0,"y":0,"width":400,"height":400}`;
  - `backend/api.md`, `backend/util.md` e `frontend/util.md`.
- [ ] T030 Ajustar `scripts/check-build.mjs` (do template) para falhar se o bundle de `dist/` contiver `createMemoryVaultSession` ou o conteúdo de `demo-vault` (AMB-03)

### Núcleo puro dos links (usado por US2, US3 e US5)

- [ ] T031 [P] Escrever `src/features/links/tests/links-parser.test.ts`:
  - `[[api]]`, `[[backend/api]]`, `[[api#Seção]]`, `[[api|texto]]`, `[[api#^bloco|texto]]` e `![[api]]` geram `LinkOccurrence` com `target`, `subpath`, `alias`, `embed` e `range` corretos;
  - `target` sem `.md` (`[[api.md]]` vira `api`);
  - links dentro de cercas ``` e de código inline são ignorados.
- [ ] T032 [P] Implementar `src/features/links/model/links.parser.ts`: `parseLinks(source: VaultPath, text: string): LinkOccurrence[]`, seguindo os campos de data-model "LinkOccurrence"
- [ ] T033 [P] Escrever `src/features/links/tests/links-index.test.ts`:
  - resolução pela RN-LINK-004: `target` com `/` é caminho exato; sem `/` é a nota com a mesma `nameKey`;
  - um nome repetido deixa o link ambíguo;
  - uma nota inexistente deixa o link sem destino (quebrado/pendente);
  - `linksTo(path)` devolve as ocorrências que resolvem para a nota;
  - `update(path, text)` e `remove(path)` mantêm o índice coerente.
- [ ] T034 Implementar `src/features/links/model/links.index.ts`: `createLinkIndex(entries, contents)` com `resolve(occurrence)`, `linksTo(path)`, `update(path, text)`, `remove(path)` e `rename(from, to)`. Exportar pelo `src/features/links/index.ts` só `createLinkIndex`, `LinkIndex` e os tipos usados fora (NOM-06)
- [ ] T035 [P] Criar `src/features/links/README.md` com as regras que o módulo aplica nesta fase (RN-LINK-004, RN-LINK-006, RN-NOTA-003/004/005/010), dizendo que a spec 002 amplia o módulo (COD-03)

**Checkpoint**: `pnpm verify` verde. A suíte de contrato passa no adapter de memória e `cargo test` passa

---

## Phase 3: User Story 1 - Abrir o vault e trabalhar com notas (Priority: P1) 🎯 MVP

**Goal**: escolher uma pasta, ver a árvore, criar notas e pastas, editar com gravação automática

**Independent Test**: abrir uma pasta, criar nota, escrever, fechar e conferir o `.md` em outro editor (spec, US1)

### Tests for User Story 1 ⚠️

- [ ] T036 [P] [US1] Escrever `src/features/vault/tests/vault-names.test.ts` (FR-005, research R7):
  - rejeita vazio após `trim`;
  - rejeita os caracteres `/ \ : * ? " < > |` e os de controle 1–31;
  - rejeita nomes terminados em `.` ou espaço;
  - rejeita `CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9` e `LPT1`–`LPT9`, com ou sem extensão, em qualquer caixa;
  - rejeita nomes acima de 255 bytes UTF-8;
  - aceita `deploy`, `ADR 0001` e `.env notas`;
  - cada motivo de erro vem em português.
- [ ] T037 [P] [US1] Escrever `src/features/vault/tests/vault-open.test.tsx` com o adapter de memória:
  - [novo] US1-1: sem vault, a tela "Escolha uma pasta para começar" aparece; ao escolher, a árvore mostra pastas, notas e canvas;
  - [novo] US1-2: com `lastOpened` preenchido, o vault abre sozinho;
  - vault inacessível mostra "Não foi possível abrir o vault".

  Buscar pelo que o usuário vê (TST-03) e interagir com `user-event` (TST-04).
- [ ] T038 [P] [US1] Escrever `src/features/vault/tests/vault-create.test.tsx`:
  - [novo] US1-3: criar nota numa pasta grava `.md` na pasta e a abre;
  - nome padrão "Sem título", e "Sem título 2" quando o primeiro já existe;
  - [novo] US1-5: criar pasta aparece no disco e na árvore;
  - criar pasta com nome que já existe na mesma pasta (inclusive por diferença só de maiúsculas) mostra "Já existe uma pasta chamada “{nome}” em {pasta}." e não cria nada;
  - nome inválido mostra o erro no campo e não grava nada.
- [ ] T039 [P] [US1] Escrever `src/features/editor/tests/note-machine.test.ts` cobrindo todas as transições do diagrama de data-model "OpenNote":
  - `clean→dirty→saving→clean`;
  - `saving→dirty` quando há edição durante a gravação;
  - `clean` + mudança externa recarrega;
  - `dirty` + mudança externa vai para `conflict`;
  - `conflict→saving` e `conflict→clean`;
  - `clean/dirty→missing` e `missing→saving`;
  - a edição pendente vale `status ∈ {dirty, saving, conflict}`.
- [ ] T040 [P] [US1] Escrever `src/features/editor/tests/note-autosave.test.tsx` com timers falsos:
  - [novo] US1-4: grava 1.000 ms depois da última edição e some o indicador "Não gravado";
  - grava na hora ao trocar de nota;
  - grava na tarefa de `onBeforeClose`;
  - em `conflict` nunca grava sozinho;
  - nota com quebras `\r\n` e BOM, depois de editada e gravada, continua com `\r\n` em todas as linhas e com o BOM; nota com `\n` continua com `\n`; nota vazia usa `\n` (FR-004, data-model "OpenNote");
  - `runBeforeMutate([path aberto])` (disparador interno do `vault.store`, T043) faz a nota com edição pendente ser gravada antes de a promessa resolver;
  - `emitEntryEvent({ kind: "moved", from, to })` atualiza o caminho da nota aberta e `emitEntryEvent({ kind: "removed", path })` fecha a nota.

### Implementation for User Story 1

- [ ] T041 [P] [US1] Implementar `src/features/vault/model/vault.names.ts` com `validateName(name): { ok: true } | { ok: false; reason: string }` pelas regras de T036 e `nextUntitledName(existingNameKeys): string` ("Sem título", "Sem título 2", …)
- [ ] T042 [P] [US1] Implementar `src/features/editor/model/note.machine.ts` como função pura `transition(state, event)` com os estados `clean | dirty | saving | conflict | missing` e os eventos `edit`, `saveStarted`, `saveDone`, `external(content)`, `externalRemoved`, `keepMine`, `keepExternal` e `recreate`, exatamente como o diagrama de data-model "OpenNote"
- [ ] T043 [US1] Implementar `src/features/vault/vault.store.ts` (Zustand, ADR-006):
  - estado: `status` (`idle | picking | loading | ready | unavailable`), `ref: VaultRef | null`, `entries: VaultEntry[]`, `vault: OpenVault | null`, `linkIndex: LinkIndex | null` e `indexStatus` (`idle | building | ready`);
  - ações: `restore()` (usa `lastOpened`), `pick()`, `refresh()`, `createNote(folder)` e `createFolder(parent, name)`;
  - depois de `open`, carrega `list()` e mostra a árvore; em segundo plano, `readMany` de todas as notas monta o `linkIndex` (research R4);
  - exporta `waitForIndex()`;
  - exporta os ganchos de data-model "VaultEvent": `onBeforeMutate(listener: (paths: VaultPath[]) => Promise<void>): () => void` (a operação espera todos os listeners) e `onEntryEvent(listener: (event: VaultEvent) => void): () => void`, com `VaultEvent` = `{ kind: "moved"; from; to }` | `{ kind: "removed"; path }` | `{ kind: "external"; change: ExternalChange }`;
  - exporta também, **fora do `index.ts`**, as funções internas de disparo `runBeforeMutate(paths): Promise<void>` e `emitEntryEvent(event): void`, usadas pelas ações da store (T062, T068, T073, T079) e importadas pelos testes por caminho relativo (T040 já as usa na US1);
  - **nunca importa `features/editor`** (plan, "Fluxo de dependências").
- [ ] T044 [US1] Implementar `src/features/vault/model/vault.operations.ts` com `createNote(vault, folder)` (usa `nextUntitledName`, grava vazio, devolve o caminho) e `createFolder(vault, parent, name)` (valida com `validateName`; se a `nameKey` já existe na pasta, falha com a mensagem "Já existe uma pasta chamada “{nome}” em {pasta}." da tabela "Mensagens" de [contracts/ui.md](./contracts/ui.md))
- [ ] T045 [US1] Implementar `src/features/editor/note.store.ts` (Zustand):
  - `open(path)` lê o arquivo e guarda o `diskHash`; detecta `lineEnding` (a primeira quebra do arquivo, `"\n"` se não houver) e `bom` (começa com U+FEFF); entrega ao editor o texto com `\n` e sem BOM; se houver nota aberta com edição pendente, grava antes de trocar;
  - `edit(text)` aplica `transition` e agenda a gravação com `appConfig.autosaveDelayMs`;
  - `flush()` grava imediatamente, convertendo `\n` para o `lineEnding` original e recolocando o BOM se `bom` for `true` (FR-004);
  - registra `flush` em `vault.onBeforeClose` e no evento `blur` da janela;
  - ao ser criado, registra-se nos ganchos do `vault.store` (T043): em `onBeforeMutate`, grava se o caminho aberto estiver entre os `paths`; em `onEntryEvent`, `moved` atualiza o caminho e `removed` fecha a nota (dependência `editor → vault`, nunca o contrário);
  - atualiza o `linkIndex` depois de cada gravação.
- [ ] T046 [P] [US1] Instalar via `pnpm exec shadcn add`, depois de consultar o MCP (LAY-08): `sidebar`, `resizable`, `collapsible`, `context-menu`, `dropdown-menu`, `empty`, `skeleton`, `kbd`, `field`, `input`, `badge`, `button`, `tooltip` e `alert-dialog`, em `src/shared/components/ui/`. O `alert-dialog` entra aqui porque a US3 e a US4 o usam e podem andar em paralelo
- [ ] T047 [P] [US1] Criar `src/shared/components/app-shell.tsx`: `SidebarProvider` + `Sidebar` esquerda com um slot de topo (nome do vault) e um slot de conteúdo (explorador), e a área central num `ResizablePanelGroup` (LAY-01, LAY-05). Recebe `sidebarHeader`, `sidebar` e `children` por props e não importa nada de `features/` (CMP-04)
- [ ] T048 [P] [US1] Criar `src/shared/components/app-empty.tsx` sobre `Empty`, com props `icon` (componente lucide), `title`, `description?` e `action?` (`{ label, onClick }` renderizado como `Button`)
- [ ] T049 [P] [US1] Criar `src/shared/components/app-editor-frame.tsx`: moldura com tokens do tema; cabeçalho com `title` e o indicador de edição pendente (`Badge` com ícone + texto "Não gravado", CMP-08); `children` é o editor. Sem cor pronta (COR-01)
- [ ] T050 [US1] Implementar `src/features/editor/components/note-editor.tsx`:
  - CodeMirror 6 (`EditorView`, `EditorState`, `markdown()`, `defaultKeymap`, `history`) montado num `div` dentro de `app-editor-frame`;
  - tema via `EditorView.theme` usando só `var(--background)`, `var(--foreground)`, `var(--ring)` e `var(--font-mono)` (COR-01, LAY-07);
  - `onChange` chama `note.store.edit`;
  - o conteúdo externo aplicado pela store não gera `edit`.
- [ ] T051 [US1] Implementar `src/features/vault/components/vault-tree.tsx` e `vault-tree-item.tsx`:
  - árvore com `SidebarMenu` + `Collapsible` por pasta;
  - ícones lucide `Folder`, `FileText` e `LayoutDashboard`;
  - clicar numa nota chama `note.store.open`;
  - item de canvas com `aria-disabled`, texto `muted-foreground` e `Tooltip` "Abrir canvas ainda não está disponível"; clicar não faz nada ([contracts/ui.md](./contracts/ui.md) "Explorador");
  - `Context Menu` e `Dropdown Menu` por item com "Nova nota" (`Kbd` `Ctrl+N`) e "Nova pasta";
  - navegação por teclado com setas e `Enter`;
  - nome acessível em todo botão com ícone (CMP-10);
  - durante `loading`, `Skeleton` no formato da árvore com `aria-busy` (CMP-07).
- [ ] T052 [US1] Reescrever `src/app/workspace.tsx` com os estados de [contracts/ui.md](./contracts/ui.md) "Telas e estados":
  - sem vault: `app-empty` "Escolha uma pasta para começar" + "Abrir pasta";
  - vault inacessível: `app-empty` + `toast.error`;
  - app fora do Tauri e fora do `dev:mock` (`vault-unavailable` vindo do T028): `app-empty` "O Dev Notes precisa rodar como app desktop";
  - carregando: esqueleto;
  - vault vazio: "Nenhuma nota ainda" + "Nova nota";
  - nenhuma nota aberta: "Selecione ou crie uma nota";
  - nota aberta: `note-editor`.

  Chamar `vault.store.restore()` ao montar.
- [ ] T053 [P] [US1] Criar `src/features/vault/index.ts`, que exporta só o que `app/` e `editor/` usam (NOM-06), e `src/features/vault/README.md` com as RN-NOTA-001..012, dizendo quais histórias já estão implementadas
- [ ] T054 [P] [US1] Criar `src/features/editor/index.ts` e `src/features/editor/README.md`, com o motivo da exceção LAY-07 (CodeMirror não existe no shadcn), a máquina de estados e a regra de gravação automática (research R12)

**Checkpoint**: US1 funciona sozinha, com T036–T040 verdes e os passos 1–3 do quickstart §4 ok em `pnpm tauri dev`

---

## Phase 4: User Story 2 - Renomear nota sem quebrar links (Priority: P2)

**Goal**: renomear nota ou pasta atualizando links e cartões de canvas, bloqueando conflitos

**Independent Test**: renomear uma nota referenciada e conferir que nenhum link aponta para o nome antigo (spec, US2)

### Tests for User Story 2 ⚠️

- [ ] T055 [P] [US2] Escrever `src/features/links/tests/links-canvas.test.ts`:
  - reescrever um nó `type: "file"` com `file: "deploy.md"` para `release.md` preserva `id`, posição, `subpath`, `color`, nós de outros tipos, `edges`, campos desconhecidos e a ordem dos nós;
  - JSON inválido não é reescrito e entra como falha.
- [ ] T056 [P] [US2] Escrever `src/features/links/tests/links-rename.test.ts` com o `planChange` puro:
  - **CA-NOTA-004-01**: `infra` com `[[deploy]]` e canvas com cartão de `deploy`; renomear para `release` gera edição `[[release]]` em `infra` e cartão `release.md`;
  - **CA-LINK-006-01**: `backend/api` + notas com `[[api]]`; renomear `frontend/util` para `api` gera `[[backend/api]]` nos links antigos;
  - `subpath`, `alias` e `!` são preservados;
  - nome que continua único usa só o nome (RN-LINK-004).
- [ ] T057 [P] [US2] Escrever `src/features/vault/tests/vault-rename.test.tsx`:
  - **CA-NOTA-006-01**: renomear `backend/util` para `api` (e para `API`) com `backend/api` existente é bloqueado com a mensagem "Já existe uma nota chamada “api” em backend." e o disco não muda;
  - renomear pasta para o nome de outra pasta irmã mostra "Já existe uma pasta chamada “{nome}” em {pasta}.";
  - renomear para o mesmo nome não faz nada;
  - mudança só de maiúsculas funciona;
  - nome inválido é bloqueado;
  - renomear pasta aplica as regras a cada nota contida (FR-018);
  - arquivo alterado fora do app entre o plano e a aplicação é pulado e listado no aviso de atualização parcial (FR-020);
  - a nota aberta com edição pendente é gravada antes e continua aberta com o novo caminho;
  - o toast de sucesso diz quantos links foram atualizados.

### Implementation for User Story 2

- [ ] T058 [P] [US2] Criar `src/features/links/types/links.schemas.ts` com o esquema Zod do JSON Canvas 1.0 (research R9): `nodes[]` com `id`, `type`, `x`, `y`, `width`, `height`, `color?`, e para `type: "file"` `file: string` e `subpath?: string`; `edges[]`. Usar objetos que preservam campos desconhecidos (`z.looseObject` ou equivalente no Zod 4.5.4)
- [ ] T059 [US2] Implementar `src/features/links/model/links.canvas.ts`: `rewriteCanvasFileRefs(json: string, renames: Map<VaultPath, VaultPath>): { changed: boolean; json: string } | { error: string }`, alterando só o campo `file` (data-model "CanvasFileRef"). O `JSON.stringify` usa indentação de 2 espaços se o original tiver quebras de linha, ou compacto se não tiver
- [ ] T060 [US2] Implementar `src/features/links/model/links.rename.ts`: `planChange(index, entries, contents, moves: {from,to}[]): ChangePlan`, seguindo os passos 1–4 de data-model "ChangePlan". `conflicts` é preenchido quando o destino já existe por `nameKey` na mesma pasta. `edits` guardam o `before` como hash do conteúdo lido. Exportar `planChange` e o tipo `ChangePlan` em `src/features/links/index.ts` nesta mesma tarefa, porque o T061 e o T062 já os usam
- [ ] T061 [US2] Adicionar `applyChangePlan(vault, plan)` em `src/features/vault/model/vault.operations.ts` (FR-019, FR-020):
  - com `conflicts` não vazio, não grava nada;
  - senão, aplica `moves` em ordem e depois `edits`, conferindo `sha256Hex` do arquivo atual contra `before` antes de cada edição;
  - pula e registra o que mudou fora do app e continua mesmo com falhas;
  - devolve `{ applied, failed: VaultPath[] }`;
  - atualiza `linkIndex` e `entries`.
- [ ] T062 [US2] Adicionar `renameEntry(path, newName)` em `src/features/vault/vault.store.ts`:
  - valida com `validateName`;
  - não faz nada se o nome não mudou;
  - espera `waitForIndex()`;
  - dispara `onBeforeMutate(caminhos afetados)` e espera os listeners (o editor grava a nota aberta, se estiver no escopo);
  - monta o plano (para pasta, um `move` da pasta com os caminhos de todas as notas contidas para o cálculo dos links) e aplica;
  - emite `onEntryEvent({ kind: "moved", from, to })` para cada nota movida (o editor atualiza o caminho da nota aberta);
  - mostra os toasts de [contracts/ui.md](./contracts/ui.md): sucesso com a quantidade de links, ou atualização parcial com a lista.
- [ ] T063 [US2] Em `src/features/vault/components/vault-tree-item.tsx`, adicionar "Renomear" (`Kbd` `F2`) no menu e no atalho: edição inline com `Input` dentro de `Field`; `Enter` confirma e `Esc` cancela; o erro de validação ou de conflito aparece no `Field` em estado de erro, com ícone + texto (CMP-08)
- [ ] T064 [US2] Atualizar `src/features/vault/README.md` (US2 implementada) e `src/features/links/README.md` (`planChange` e as regras de reescrita)

**Checkpoint**: T055–T057 verdes; passos 4–7 do quickstart §4 ok

---

## Phase 5: User Story 3 - Excluir nota ou pasta com segurança (Priority: P2)

**Goal**: excluir com confirmação para a lixeira do sistema, bloqueando quando a lixeira não existe

**Independent Test**: excluir nota e pasta, conferir a lixeira e que os links continuam no texto (spec, US3)

### Tests for User Story 3 ⚠️

- [ ] T065 [P] [US3] Escrever `src/features/vault/tests/vault-delete.test.tsx` com o adapter de memória:
  - **CA-NOTA-001-01**: excluir e confirmar manda a nota para `trash.removed` e a tira da árvore;
  - **CA-NOTA-001-02**: cancelar não altera nada;
  - **CA-NOTA-001-03**: com `setAvailable(false)`, aparece "A lixeira do sistema não está disponível. Nada foi excluído; você pode excluir pelo gerenciador de arquivos." e a nota continua;
  - **CA-NOTA-003-01**: depois de excluir `deploy`, `infra` ainda contém `[[deploy]]` byte a byte e o `linkIndex` o resolve como sem destino;
  - **CA-NOTA-009-01**: a pasta com 3 notas mostra "3 notas irão para a lixeira do sistema." e, ao confirmar, a pasta inteira vai para a lixeira;
  - **CA-NOTA-009-02**: cancelar a exclusão da pasta não altera nada;
  - pasta vazia mostra "A pasta não contém notas.";
  - pasta com 2 notas e 1 imagem informa "2 notas e 1 outro arquivo";
  - excluir a nota aberta fecha o editor e mostra "Selecione ou crie uma nota".

### Implementation for User Story 3

- [ ] T066 [P] [US3] Implementar `src/features/vault/model/vault.deletion.ts`: `describeDeletion(entries, target): DeletionRequest` (`target`, `noteCount`, `otherCount` = tudo o que não é nota, inclusive canvas, contando recursivamente; data-model "DeletionRequest") e `deletionMessage(request)` com os textos exatos de [contracts/ui.md](./contracts/ui.md) "Mensagens", no singular e no plural
- [ ] T067 [P] [US3] Criar `src/shared/components/app-confirm.tsx` (o `alert-dialog` já foi instalado no T046): `AlertDialog` controlado com `title`, `description`, `confirmLabel`, `onConfirm` e `onCancel`; botão de ação com `variant="destructive"`; o foco inicial fica em "Cancelar" (LAY-04)
- [ ] T068 [US3] Adicionar `deleteEntry(path)` em `src/features/vault/vault.store.ts`: dispara `onBeforeMutate` e chama `trash.moveToTrash`; em `trash-unavailable`, mostra o `toast.error` da tabela de mensagens e não altera nada (FR-024); em sucesso, remove de `entries`, remove do `linkIndex` como origem sem reescrever outras notas (RN-NOTA-003) e emite `onEntryEvent({ kind: "removed", path })` para cada nota do escopo (o editor fecha a nota aberta)
- [ ] T069 [US3] Em `src/features/vault/components/vault-tree-item.tsx`, adicionar "Excluir" (`Kbd` `Delete`) no menu e no atalho, abrindo `app-confirm` com `describeDeletion` e `deletionMessage`
- [ ] T070 [US3] Atualizar `src/features/vault/README.md` (US3 implementada, com o comportamento da FR-024)

**Checkpoint**: T065 verde; passos 9, 10 e 14 do quickstart §4 ok

---

## Phase 6: User Story 4 - Conviver com outras ferramentas editando o vault (Priority: P2)

**Goal**: refletir alterações externas sem perder a edição pendente

**Independent Test**: com uma nota aberta, alterar o arquivo em outro editor com e sem edição pendente (spec, US4)

### Tests for User Story 4 ⚠️

- [ ] T071 [P] [US4] Escrever `src/features/editor/tests/note-external.test.tsx` com `simulateExternal`:
  - **CA-NOTA-007-01**: sem edição pendente, o editor mostra o conteúdo novo;
  - **CA-NOTA-008-01**: com edição pendente, aparece o diálogo "“deploy” foi alterada fora do Dev Notes" com "Manter minha versão" e "Usar versão do arquivo", e nada é gravado antes da escolha;
  - [novo] US4-3: "Manter minha versão" grava o buffer; "Usar versão do arquivo" descarta o buffer e mostra o arquivo;
  - [novo] US4-4: a gravação do próprio app não abre o diálogo;
  - nota aberta removida fora do app mostra "Esta nota foi excluída fora do Dev Notes"; com edição pendente aparece "Recriar com este conteúdo", que grava de novo no mesmo caminho.
- [ ] T072 [P] [US4] Escrever `src/features/vault/tests/vault-external.test.tsx`:
  - `created` externo aparece na árvore e entra no `linkIndex`;
  - `removed` sai da árvore e do índice;
  - `modified` numa nota fechada atualiza o índice;
  - renomear fora do app (`removed` + `created`) não reescreve links;
  - a raiz do vault removida com o app aberto (`simulateExternal({ kind: "removed", path: "" })`) leva ao status `unavailable` e à tela "A pasta do vault não está mais acessível" com "Escolher outra pasta" (spec, Edge Cases).

### Implementation for User Story 4

- [ ] T073 [US4] Em `src/features/vault/vault.store.ts`, assinar `vault.watcher.subscribe` ao abrir o vault: `created`/`removed` atualizam `entries`; `created`/`modified` de nota fazem `readText` + `linkIndex.update`; `removed` faz `linkIndex.remove`. Emitir cada mudança como `onEntryEvent({ kind: "external", change })`, sem importar `features/editor`. Se chegar `{ kind: "removed", path: "" }` (raiz do vault) ou alguma operação rejeitar com `vault-unavailable`, mudar o `status` para `unavailable`, e o `workspace.tsx` mostra "A pasta do vault não está mais acessível" com "Escolher outra pasta". Cancelar a assinatura em `close`
- [ ] T074 [US4] Em `src/features/editor/note.store.ts`, tratar os eventos `external` recebidos pelo gancho `onEntryEvent` (registrado no T045) quando o caminho for o da nota aberta:
  - `modified` com conteúdo diferente de `diskHash` aplica `transition(external)`: em `clean`, troca o buffer; em `dirty`/`saving`, vai para `conflict` guardando `externalContent`;
  - `removed` aplica `externalRemoved`;
  - adicionar as ações `keepMine()` (grava o buffer), `keepExternal()` (troca o buffer) e `recreate()` (grava no mesmo caminho e atualiza `entries`).
- [ ] T075 [P] [US4] Criar `src/shared/components/app-choice-dialog.tsx`: `AlertDialog` controlado com `title`, `description` e duas ações nomeadas (`primary: { label, onSelect }` e `secondary: { label, onSelect }`), sem opção de fechar sem escolher
- [ ] T076 [US4] Criar `src/features/editor/components/note-conflict-dialog.tsx` usando `app-choice-dialog` com os textos de [contracts/ui.md](./contracts/ui.md) "Conflito externo", ligado a `keepMine` e `keepExternal`; em `src/app/workspace.tsx`, mostrar o estado `missing` com `app-empty` "Esta nota foi excluída fora do Dev Notes" e a ação "Recriar com este conteúdo" só quando havia edição pendente
- [ ] T077 [US4] Atualizar `src/features/editor/README.md` e `src/features/vault/README.md` (US4 implementada, RN-NOTA-007/008)

**Checkpoint**: T071–T072 verdes; passos 11–13 do quickstart §4 ok

---

## Phase 7: User Story 5 - Mover nota entre pastas (Priority: P3)

**Goal**: mover nota ou pasta com o mesmo cuidado com links que o renomear

**Independent Test**: mover uma nota referenciada para outra pasta e conferir links e cartões (spec, US5)

### Tests for User Story 5 ⚠️

- [ ] T078 [P] [US5] Escrever `src/features/vault/tests/vault-move.test.tsx`:
  - **CA-NOTA-010-01**: `infra` com `[[backend/api]]`; mover `backend/api` para `servicos/` gera `[[servicos/api]]` quando `api` continua repetido, ou `[[api]]` quando fica único, conforme RN-LINK-004;
  - **CA-NOTA-010-02**: o cartão do canvas aponta para `servicos/api.md`;
  - **CA-NOTA-010-03**: `deploy` único movido para `runbooks/` mantém `[[deploy]]`;
  - **CA-NOTA-011-01**: com `servicos/api` existente, mover `backend/api` é bloqueado com aviso e nada muda;
  - mover pasta leva as notas e atualiza os links de todas (FR-018);
  - mover pasta para dentro dela mesma é bloqueado;
  - mover para a própria pasta atual não faz nada.

### Implementation for User Story 5

- [ ] T079 [US5] Adicionar `moveEntry(path, targetFolder)` em `src/features/vault/vault.store.ts`: bloqueia destino dentro do próprio caminho, não faz nada se a pasta for a mesma e, fora isso, segue o mesmo fluxo de `renameEntry` (`waitForIndex`, `onBeforeMutate`, `planChange`, `applyChangePlan`, `onEntryEvent` `moved`, toasts), reaproveitando o código sem duplicar
- [ ] T080 [P] [US5] Instalar `dialog` e `command` via shadcn e criar `src/features/vault/components/vault-move-dialog.tsx`: `Dialog` com `Command` listando todas as pastas do vault (mais a raiz), com busca por nome; a seleção chama `moveEntry`
- [ ] T081 [US5] Em `src/features/vault/components/vault-tree-item.tsx`, adicionar "Mover para…" no menu, abrindo `vault-move-dialog`
- [ ] T082 [US5] Atualizar `src/features/vault/README.md` (US5 implementada; a nota sobre RN-NOTA-012 segue a spec)

**Checkpoint**: T078 verde; passo 8 do quickstart §4 ok; todas as histórias funcionam

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: jornadas ponta a ponta, desempenho, documentação e revisão

- [ ] T083 [P] Escrever `e2e/vault.spec.ts` (Playwright no `pnpm dev:mock`, TST-07):
  - criar uma nota e escrever;
  - renomear `deploy` para `release` e ver `[[release]]` em `infra`;
  - criar a pasta `servicos/`, mover `backend/api` para ela e ver o link de `infra` apontar para `servicos/api` (jornada "mover" exigida pela constituição);
  - excluir com confirmação e ver o link continuar no texto;
  - conflito externo resolvido pelas duas opções, usando um gancho de teste exposto só no modo `mock`.

  Configurar `playwright.config.ts` para subir `pnpm dev:mock`.
- [ ] T084 [P] Criar `src/features/vault/tests/fixtures/synthetic-vault.ts` com `createSyntheticVault({ notes: 5000, linkingToTarget: 200 })`, que gera o seed com `alvo.md` referenciado por 200 notas em pastas variadas, e `src/features/vault/tests/vault-performance.test.ts`, que mede no adapter de memória: montar o índice e renomear `alvo` atualiza 200 links em menos de 5 s (SC-002) e deixa 0 links para o nome antigo (SC-001)
- [ ] T085 Medir no app desktop, com o vault sintético gravado em disco, o tempo até a árvore (≤ 3 s, SC-006), o renomear de `alvo` (≤ 5 s, SC-002) e a alteração externa (≤ 2 s, SC-004). Se a árvore passar da meta, mover a montagem do índice para depois do primeiro render e medir de novo. Registrar os números em `specs/001-vault-notas/quickstart.md` §5
- [ ] T086 [P] Atualizar `docs/arquitetura.md`:
  - ADRs 001, 004, 006, 008 e 011 com status **Aceito** na §11;
  - na árvore da §5, trocar `docs/architecture.md` por `docs/arquitetura.md`;
  - adicionar os comandos Rust e `AppConfig/vault.json` na §7;
  - registrar que `HistoryStore` e `SettingsStore` entram com as specs de histórico e abas.
- [ ] T087 [P] Atualizar `docs/regras-de-negocio.md` §9 com os cenários [novo] da spec: CA-NOTA-001-03, CA-NOTA-009-01/02 e CA-NOTA-010-02/03. Adicionar a observação sobre a RN-NOTA-012 (mover sozinho não torna um nome repetido) como item em §12 "Pendências" para o responsável pelo produto decidir, sem alterar a regra
- [ ] T088 Rodar a skill `app-review-standards` sobre todas as mudanças e corrigir tudo o que for "Bloqueia" e "Deveria corrigir"
- [ ] T089 [P] Reescrever `README.md` para o produto atual (app desktop Tauri, local-first, vault de Markdown, lixeira do sistema), removendo as seções do produto antigo (navegador, Tiptap, PDF, Codex, `.devnotes/trash`, npm). Seguir `docs/brand.md` para nome, slogan e imagens existentes
- [ ] T090 Rodar `pnpm verify` e `pnpm test:e2e`, e depois o roteiro manual de [quickstart.md](./quickstart.md) §4 nos três sistemas (Windows, macOS e Linux). Registrar no fim do quickstart o que foi verificado em cada sistema e a conferência do método de lixeira no macOS (research R6)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup e **bloqueia todas as histórias**.
- **US1 (Phase 3)**: depende da Foundational.
- **US2, US3 e US4 (Phases 4–6)**: dependem da Foundational para o modelo e os testes, e da US1
  para a interface (árvore, editor, stores).
- **US5 (Phase 7)**: depende da US2 (`planChange` e `applyChangePlan`).
- **Polish (Phase 8)**: depende das histórias desejadas.

### User Story Dependencies

```text
Setup → Foundational → US1 ─┬─→ US2 ──→ US5
                            ├─→ US3
                            └─→ US4
```

- **US1 (P1)**: nenhuma outra história.
- **US2 (P2)**: US1 (árvore e `vault.store`).
- **US3 (P2)**: US1. Independente de US2.
- **US4 (P2)**: US1 (`note.store`). Independente de US2 e US3.
- **US5 (P3)**: US2.

### Within Each User Story

- Testes escritos e falhando antes da implementação.
- Modelo puro (`model/`) antes das stores, e stores antes dos componentes.
- A história fica pronta, com `pnpm verify` verde, antes da próxima prioridade.

### Parallel Opportunities

- Setup: T005, T006, T009, T011, T012 e T013 juntos, depois de T004.
- Foundational:
  - T016–T019, T023, T029, T031–T033 e T035 são arquivos independentes e rodam juntos;
  - o Rust (T023–T026) anda em paralelo com o TypeScript (T015–T022).
- US1: todos os testes (T036–T040) juntos; T041, T042 e T046–T049 juntos.
- Depois da US1, **US2, US3 e US4 podem andar em paralelo**, mas todas tocam
  `vault-tree-item.tsx` e `vault.store.ts`, então é preciso combinar a ordem dos merges nesses
  arquivos.

---

## Parallel Example: User Story 1

```bash
# Testes da US1 juntos:
Task: "T036 vault-names.test.ts em src/features/vault/tests/"
Task: "T037 vault-open.test.tsx em src/features/vault/tests/"
Task: "T038 vault-create.test.tsx em src/features/vault/tests/"
Task: "T039 note-machine.test.ts em src/features/editor/tests/"
Task: "T040 note-autosave.test.tsx em src/features/editor/tests/"

# Modelo puro e composições juntos:
Task: "T041 vault.names.ts"
Task: "T042 note.machine.ts"
Task: "T047 app-shell.tsx"
Task: "T048 app-empty.tsx"
Task: "T049 app-editor-frame.tsx"
```

## Parallel Example: User Stories 2, 3 e 4 (depois da US1)

```bash
Task: "T055–T060 links canvas/rename (US2)"
Task: "T065–T067 exclusão (US3)"
Task: "T071–T075 alteração externa (US4)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (o projeto nasce).
2. Phase 2: Foundational (`shared/vault` + núcleo de links). **Crítico.**
3. Phase 3: US1.
4. **Parar e validar**: passos 1–3 do quickstart §4 em `pnpm tauri dev`.

O resultado é um editor de notas local que já grava em Markdown puro.

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. US1 → MVP (abrir, criar, editar).
3. US2 → renomear sem quebrar links (principal garantia de integridade).
4. US3 → excluir com segurança.
5. US4 → conviver com outros editores.
6. US5 → mover.
7. Polish → e2e, desempenho, docs, revisão, três sistemas.

### Parallel Team Strategy

- Todos juntos no Setup e na Foundational: uma pessoa no Rust (T023–T026), outra no TypeScript
  (T015–T022, T031–T034).
- Depois da US1:
  - pessoa A: US2 e depois US5;
  - pessoa B: US3;
  - pessoa C: US4.

---

## Notes

- 90 tarefas. As marcadas [P] tocam arquivos diferentes e não dependem de tarefas incompletas.
- O rótulo [USn] liga a tarefa à história da spec para rastreabilidade.
- Faça commit a cada tarefa ou grupo lógico.
- Evite: tarefas vagas, dois agentes no mesmo arquivo, criar composições `app-*` ou interfaces
  de `shared/vault` que nenhuma tarefa usa (NOM-05, COD-04).
