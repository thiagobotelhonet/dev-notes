# Research: Vault e Notas

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · Pesquisa feita em 2026-09-29

Fontes: `docs/arquitetura.md` v0.3, `docs/brand.md` v0.1, repositório
`thiagocorreanet/react-standards-template` (main, commit 4d2ad32), documentação oficial do Tauri 2,
docs.rs, jsoncanvas.org e Microsoft Learn (links em cada item).

## R1. Como o projeto nasce do template

- **Decision**: gerar o código a partir do `react-standards-template` (ADR-002) na raiz deste
  repositório, preservando `docs/` e `specs/`, e então:
  - **remover**: `features/auth`, `features/items`, `src/routes/`, `router.tsx`,
    `routeTree.gen.ts`, `shared/api/`, `mocks/handlers.ts` e `mocks/browser.ts` (MSW),
    `app-table.tsx`, `request-error.tsx`, as dependências `@tanstack/react-router`,
    `@tanstack/react-query`, `@tanstack/react-table`, `ky` e `msw`, e o `docs/api-contract.md`;
  - **adaptar** o `docs/standards.md`: remover `ROT-*`, `API-*`, `SEG-*`, `EST-01`, `EST-04`,
    `CMP-05`, `CMP-06`, `TST-06`, `AMB-04` e `FER-03`; mover o `<Toaster>` da CMP-09 para
    `src/app/root.tsx`; registrar a exceção da EST-03 (ADR-006);
  - **manter**: `NOM`, `COD`, `IDI`, `CMP-01..04, 07..10`, `COR-01..04`, `FRM`, `FMT`, `FER-01/02`,
    `TST` (menos a 06), `AMB-01..03`, o Biome, o Vitest, o Playwright, o `ThemeProvider`, o
    `.mcp.json` do shadcn e a skill `app-review-standards`.
- **Rationale**: é o que `arquitetura.md` §3 manda; quem remove a camada HTTP também remove as
  regras que só existem por causa dela.
- **Alternatives considered**: começar do zero com `create-tauri-app` (perde os padrões, a revisão
  e o `ThemeProvider`); manter o TanStack Router sem uso real (viola a COD-04).
- **Fato do template**: o Base UI vem de `@base-ui/react` 1.8.0; o `components.json` usa
  `style: base-nova`, `iconLibrary: lucide` e aliases em `@/shared/*`; o `pnpm verify` roda
  `check`, `typecheck`, `test`, `test:generator` e `build`. O `test:generator` sai junto com o
  script gerador.

## R2. Versões fixadas

- **Decision**: versões exatas, sem `^` (FER-02):

| Pacote | Versão |
| --- | --- |
| `tauri`, `@tauri-apps/api`, `@tauri-apps/cli` | 2.12.0 |
| `tauri-plugin-fs`, `@tauri-apps/plugin-fs` | 2.6.0 (feature Cargo `watch`) |
| `tauri-plugin-dialog`, `@tauri-apps/plugin-dialog` | 2.8.0 |
| `trash` (crate) | 5.2.9 |
| `react`, `react-dom` | 19.2.8 (template) |
| `@base-ui/react` | 1.8.0 (template) |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 (template) |
| `zod` | 4.5.4 (template) |
| `vite` / `typescript` / `vitest` / `@biomejs/biome` | 8.2.2 / 6.0.3 / 4.1.11 / 2.5.12 (template) |
| `zustand`, `@codemirror/*`, `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` | versão estável mais recente na hora de instalar, fixada exata |

- **Rationale**: o workspace de plugins do Tauri publicou a `fs 3.0.0-alpha.2` em 2026-09-27, com
  mudanças incompatíveis (formato do evento de watch e remoção de `read_text_file`). Fixar a v2
  evita quebra silenciosa.
  <https://github.com/tauri-apps/plugins-workspace/pull/3616>
- **Alternatives considered**: adotar a v3 alpha (instável para o MVP).

## R3. Acesso à pasta do vault e reabertura (FR-001)

- **Decision**: dois comandos Rust próprios, `vault_pick` e `vault_restore`:
  - `vault_pick` abre o seletor de pasta, libera a pasta escolhida no escopo do `fs` com
    `fs_scope().allow_directory(path, true)` e grava o caminho em `AppConfig/vault.json`;
  - `vault_restore` roda na inicialização, lê esse arquivo e libera de novo a pasta, se ela
    ainda existir.

  O frontend nunca pede ao Rust para liberar um caminho arbitrário; a liberação só acontece a
  partir da escolha do usuário ou do caminho que o próprio Rust gravou. Guardar o último vault
  fora dele é a "configuração global do app" permitida pelo princípio II da constituição 1.0.1.
- **Rationale**: a escolha de pasta pelo `plugin-dialog` já adiciona a pasta ao escopo, mas essa
  permissão some ao reiniciar o app. O `tauri-plugin-persisted-scope` resolveria, mas corrompe o
  escopo de forma persistente quando o caminho tem `[` sem par (tauri#11708) e falha em silêncio
  se registrado na ordem errada.
  <https://v2.tauri.app/plugin/persisted-scope/> ·
  <https://github.com/tauri-apps/tauri/issues/11708>
- **Alternatives considered**: `persisted-scope` (bug acima); escopo estático `$HOME/**` (acesso
  largo demais e não cobre vaults fora do HOME).
- **Capabilities**: `fs:allow-read-text-file`, `fs:allow-write-text-file`, `fs:allow-mkdir`,
  `fs:allow-rename`, `fs:allow-exists`, `fs:allow-stat`, `fs:allow-watch`, `fs:allow-unwatch`, e
  os comandos próprios do app. Nenhum `fs:scope` estático; `fs:allow-remove` fica de fora porque
  o app nunca exclui de vez.

## R4. Listar o vault e ler as notas (FR-002, SC-006)

- **Decision**: comandos Rust `vault_scan` (lista recursiva num único IPC, ignorando nomes que
  começam com `.`) e `vault_read_notes` (lê várias notas de uma vez para o índice de links). As
  operações de arquivo único usam o `plugin-fs`.
- **Rationale**: o `readDir` do `plugin-fs` v2 não é recursivo e devolve só nomes, então listar
  5.000 notas custaria um IPC por pasta. E renomear exige ler o conteúdo de todas as notas.
  <https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/fs/guest-js/index.ts>
- **Segurança**: comandos próprios não passam pelo escopo do `fs`, então o Rust confere que todo
  caminho canonizado está dentro da raiz do vault aberto; se não estiver, rejeita. O
  `vault_scan` não segue links simbólicos nem os lista, e o `resolve_in_vault` rejeita qualquer
  caminho cujo destino canonizado saia do vault. Assim o `plugin-fs` nunca recebe um caminho de
  link simbólico e o scan não entra em loop.
- **Ordem de carga**: primeiro a árvore (meta da SC-006: 3 s), depois o índice em segundo plano.
  Renomear ou mover antes do índice ficar pronto espera o índice terminar.
- **Alternatives considered**: `readDir` recursivo feito no TypeScript (muitos IPCs); ler notas
  sob demanda na hora de renomear (renomear ficaria lento e imprevisível).

## R5. Observar alterações externas e ignorar as próprias (FR-021–FR-023, SC-004)

- **Decision**: `watch(root, cb, { recursive: true, delayMs: 300 })` do `plugin-fs` (feature
  `watch`). Cada evento é tratado **só como aviso** de que um caminho mudou; o adapter confere o
  estado real (`exists` e leitura) e compara o hash do conteúdo com o registro de escritas do app
  (ledger), usando SHA-256 via Web Crypto. O que casar com o ledger é descartado; o resto vira
  `ExternalChange` (`created`, `modified` ou `removed`).
- **Rationale**: o tipo de evento varia por sistema (um rename pode chegar como create+remove ou
  como modify/rename), e no Windows o buffer pode estourar e pedir uma nova varredura. Comparar
  pelo conteúdo real é robusto a tudo isso; comparar só pelo tempo falharia com escritas
  simultâneas.
  <https://github.com/tauri-apps/plugins-workspace/pull/3621>
- **Estouro de buffer (rescan)**: faz uma nova varredura e compara com a árvore em memória.
- **Alternatives considered**: `watchImmediate` (sem debounce; há relatos de dificuldade para
  parar, tauri discussion #11087); ignorar pelo tempo desde a gravação (frágil).

## R6. Lixeira do sistema (FR-007, FR-010, FR-024)

- **Decision**: comando Rust `vault_trash(path)` com o crate `trash` 5.2.9 (`trash::delete`), com
  as chamadas serializadas por um `Mutex` e o caminho validado dentro do vault. Qualquer
  `trash::Error` vira `trash-unavailable`, sem outra tentativa: nunca cai para exclusão definitiva.
  No macOS, usar `DeleteMethod::NsFileManager` para não depender do Finder.
- **Rationale**:
  - Não existe plugin oficial de lixeira; o pedido tauri#5680 continua aberto.
  - O crate cobre Windows, macOS e Linux (freedesktop 1.0), inclusive pastas.
  - No Linux ele cria a lixeira da home se faltar, então o "indisponível" real aparece como erro
    de sistema de arquivos.
  - A documentação avisa que ele não é seguro para várias threads no Linux, daí o `Mutex`.
  - <https://docs.rs/trash/latest/trash/> · <https://github.com/tauri-apps/tauri/issues/5680>
- **A verificar na implementação**: o comportamento do método Finder no macOS (possível pedido de
  permissão de automação) e o nome exato da API do `NsFileManager` na versão 5.2.9.
- **Alternatives considered**: pasta `.trash` no vault (rejeitada pela DEC-PROD-010);
  `plugin-shell` para chamar `gio trash` (depende do ambiente e abre uma superfície maior).

## R7. Nomes: validação e comparação (FR-005, FR-013, FR-016)

- **Decision**: aplicar as regras do Windows em todos os sistemas:
  - proibidos `< > : " / \ | ? *`, NUL e os caracteres de controle 1–31;
  - nomes reservados `CON`, `PRN`, `AUX`, `NUL`, `COM1–9`, `LPT1–9` e as variantes com
    sobrescrito, com ou sem extensão;
  - não terminar em espaço nem em ponto;
  - no máximo 255 bytes por nome.

  Conflito é detectado pela `nameKey` (NFC + minúsculas). A regra fica numa função pura em
  `features/vault/model/vault.names.ts`, testada isoladamente.
- **Rationale**: um vault precisa abrir em qualquer sistema. O NTFS e o APFS não diferenciam
  maiúsculas por padrão.
  <https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file>
- **Alternatives considered**: validar só pelo sistema atual (um vault criado no Linux quebraria
  no Windows).

## R8. Renomear mudando só maiúsculas (`api` → `API`)

- **Decision**: o `VaultStorage.move` detecta a mesma `nameKey` com grafia diferente e renomeia
  em dois passos, `api.md` → `api.md.devnotes-tmp-<id>` → `API.md`, registrando os dois passos no
  ledger. A checagem de "destino existe" ignora o próprio arquivo de origem.
- **Rationale**: em FAT/exFAT e em alguns volumes SMB, a renomeação direta "dá certo" sem trocar
  as maiúsculas ou falha; e o `exists(destino)` devolve `true` por ser o mesmo arquivo.
  <https://github.com/vadcx/movefileex-casesensitivity>
- **Alternatives considered**: renomear direto e conferir depois (dois caminhos de código para o
  mesmo caso).

## R9. Formato dos cartões de canvas (FR-012)

- **Decision**: o nó `type: "file"` do JSON Canvas 1.0 guarda em `file` o caminho a partir da
  raiz do vault, com `/` e com extensão (`"backend/api.md"`). O `subpath`, se existir, é
  preservado. A reescrita troca só o `file` e grava o JSON de volta preservando todos os outros
  campos e a ordem dos nós.
- **Rationale**: é a convenção do `sample.canvas` oficial e do Obsidian (princípio II:
  compatibilidade). <https://jsoncanvas.org/spec/1.0/>
- **Alternatives considered**: nenhuma; é o formato definido pela constituição.

## R10. Estado da interface (exceção à EST-03)

- **Decision**: duas stores Zustand:
  - `vault.store.ts`: vault aberto, árvore e status do índice;
  - `note.store.ts`: `OpenNote` e sua máquina de estados, em `features/editor`.

  O índice de links fica dentro de `features/links/model`, não numa store React.
- **Rationale**: o explorador, o editor, o observador de mudanças e os diálogos de conflito
  compartilham esse estado; passar por props ou context atravessaria o `app-shell` inteiro. É o
  caso previsto no ADR-006.
- **Alternatives considered**: React Context (re-render amplo e mais código de ligação);
  `useSyncExternalStore` feito à mão (reimplementaria o Zustand).

## R11. Editor desta spec

- **Decision**: CodeMirror 6 com o mínimo necessário (`@codemirror/state`, `@codemirror/view`,
  `@codemirror/commands`, `@codemirror/lang-markdown`), dentro do `app-editor-frame`, com tema
  feito só de tokens CSS (COR-01, LAY-07). Destaque de código e autocomplete ficam para a spec
  do editor.
- **Quebras de linha e BOM**: o CodeMirror trabalha só com `\n`, então o `note.store` detecta na
  leitura a quebra do arquivo (`\r\n` ou `\n`) e o BOM, entrega ao editor o texto com `\n` e sem
  BOM, e reaplica os dois ao gravar. Sem isso, a primeira edição de uma nota com CRLF
  reescreveria o arquivo inteiro (FR-004, SC-007).
- **Rationale**: o editor final é o CodeMirror (ADR-004). Começar com um `Textarea` do shadcn
  obrigaria a reescrever o estado de edição pendente depois.
- **Alternatives considered**: `Textarea` do shadcn (troca garantida mais tarde).

## R12. Gravação automática (FR-004)

- **Decision**: grava 1.000 ms depois da última tecla, e imediatamente ao trocar de nota, ao
  perder o foco da janela e ao fechar o app (evento `onCloseRequested` da janela, esperando a
  gravação terminar). No estado `conflict` não há gravação automática.
- **Rationale**: é a suposição registrada na spec e minimiza a janela de "edição pendente" usada
  pelas RN-NOTA-007/008.

## R13. Escolha do adapter e o mock

- **Decision**: `shared/vault/index.ts` escolhe o adapter por uma condição que o Vite resolve
  **no build**: `import.meta.env.MODE === "mock"`. Com ela, o adapter de memória e o vault de
  demonstração (`src/mocks/`) entram por `import()` dinâmico e usam o seed, no `pnpm dev:mock` e
  no Playwright. Em qualquer outro modo, o adapter Tauri é usado; se `isTauri()` for `false`
  (app aberto num navegador comum), a sessão falha com `vault-unavailable` e a tela mostra o
  erro. O Vitest não passa por essa escolha: os testes montam o adapter de memória direto. O
  `build` de produção confere que o adapter de memória e o seed não estão em `dist/` (AMB-03,
  `scripts/check-build.mjs`).
- **Rationale**: uma condição resolvida só em tempo de execução, como `!isTauri()`, manteria o
  `import()` do adapter de memória como um arquivo à parte dentro de `dist/`, e o build falharia
  na checagem da AMB-03. O `isTauri()` de `@tauri-apps/api/core` segue útil só para a mensagem
  de erro. <https://v2.tauri.app/reference/javascript/api/namespacecore/>

## R14. Testes

- **Decision**:
  - **Suíte de contrato** do `shared/vault`: a mesma suíte roda contra o adapter de memória
    sempre, e contra o Tauri num job opcional de CI desktop.
  - **Critérios `CA-*`** viram testes Vitest em `features/*/tests/`, sobre o adapter de memória,
    com nomes que citam o ID do critério.
  - **Jornadas no Playwright** (`e2e/vault.spec.ts`): criar, renomear com links, excluir e
    conflito externo, rodando no `pnpm dev:mock`.
  - **Rust**: `cargo test` na validação de caminho dentro do vault.
- **Rationale**: constituição, seção "Fluxo de Desenvolvimento"; TST-01, TST-07.

## Sem pendências

Nenhum item de Technical Context ficou como NEEDS CLARIFICATION. Os pontos "a verificar na
implementação" (R6, macOS) não mudam o design: qualquer falha da lixeira já cai no caminho seguro
da FR-024.
