# Contrato: `shared/vault` (ports)

> A spec 002 acrescenta `VaultEntry.modifiedAt` e `AppDataStore` (dados do app em
> `.devnotes/`): [contrato da 002](../../002-links-incorporacao/contracts/shared-vault.md).

**Feature**: [../spec.md](../spec.md) · **Modelo**: [../data-model.md](../data-model.md)

Ponto único de acesso ao sistema operacional (constituição, princípio III). Features, componentes e
stores importam **só** daqui; nunca de `@tauri-apps/*`.

Dois adapters implementam todas as interfaces com o mesmo comportamento observável:

| Adapter | Onde roda | Uso |
| --- | --- | --- |
| `tauri` | App desktop | Produção |
| `memory` | Navegador e Node | Vitest, Playwright, `pnpm dev:mock` |

Uma **suíte de contrato** única (`shared/vault/tests/vault-contract.test.ts`) define o
comportamento esperado. Ela roda automaticamente contra o adapter de memória. No adapter Tauri, a
equivalência é conferida pelo `cargo test` e pelo roteiro manual do quickstart §6, que repete os
mesmos casos no app desktop (research R14). A execução automática contra o Tauri fica para depois
desta feature.

Só entram as interfaces que esta feature usa (NOM-05, COD-04). `HistoryStore` e o restante de
`SettingsStore` chegam com as specs de histórico e de abas.

## Tipos comuns

```ts
type VaultPath = string            // relativo à raiz, separado por "/", ver data-model.md
type EntryKind = "folder" | "note" | "canvas" | "other"

interface VaultEntry {
  path: VaultPath
  kind: EntryKind
  name: string
}

type VaultErrorCode =
  | "not-found"          // caminho não existe
  | "already-exists"     // destino já existe (inclui diferença só de maiúsculas)
  | "invalid-name"       // nome proibido pelo sistema
  | "permission-denied"  // sem acesso à pasta
  | "trash-unavailable"  // lixeira do sistema indisponível (FR-024)
  | "vault-unavailable"  // raiz do vault apagada ou inacessível
  | "io"                 // demais falhas de leitura/gravação

class VaultError extends Error {
  code: VaultErrorCode
  path?: VaultPath
}
```

Todo método rejeita com `VaultError`; nunca com erro cru do Tauri ou do sistema.

## `VaultSession`

Abre e fecha um vault. Devolve as demais interfaces já ligadas à raiz escolhida.

```ts
interface VaultSession {
  /** Mostra o seletor de pasta do sistema. `null` se o usuário cancelar. */
  pickFolder(): Promise<string | null>
  /**
   * Abre a pasta como vault e garante acesso a ela nas próximas execuções. Só aceita a raiz
   * vinda de `pickFolder` ou `lastOpened`; rejeita com "vault-unavailable" qualquer outra, ou se
   * a pasta não existir.
   */
  open(root: string): Promise<OpenVault>
  /**
   * Último vault aberto (FR-001), ou `null` se nunca houve um. Devolve o `VaultRef` mesmo que a
   * pasta não exista mais; nesse caso o `open` dele rejeita com "vault-unavailable" e a tela
   * mostra "Não foi possível abrir o vault".
   */
  lastOpened(): Promise<VaultRef | null>
}

interface OpenVault {
  ref: VaultRef
  storage: VaultStorage
  watcher: FileWatcher
  trash: Trash
  /**
   * Registra uma tarefa que roda antes de o app fechar (gravação pendente, research R12).
   * O fechamento espera todas as tarefas terminarem. Devolve a função de cancelar.
   */
  onBeforeClose(task: () => Promise<void>): () => void
  close(): Promise<void>
}
```

## `VaultStorage`

```ts
interface VaultStorage {
  /** Lista recursiva; ignora nomes que começam com "." (FR-002). */
  list(): Promise<VaultEntry[]>
  /** O texto inteiro, com o BOM inicial se houver (FR-004). */
  readText(path: VaultPath): Promise<string>
  /**
   * Leitura em lote para montar o índice de links (research R4), na ordem
   * pedida. Arquivo que sumiu entre a listagem e a leitura fica de fora.
   */
  readMany(paths: VaultPath[]): Promise<{ path: VaultPath; content: string }[]>
  /** Grava e registra a escrita no ledger (FR-023). Cria a pasta pai se preciso. */
  writeText(path: VaultPath, content: string): Promise<void>
  /** Falha com "already-exists" se o destino existir (nameKey). */
  createFolder(path: VaultPath): Promise<void>
  /**
   * Renomeia ou move arquivo ou pasta. Falha com "already-exists" se o destino existir.
   * Mudança só de maiúsculas é permitida (renomeia via nome temporário).
   */
  move(from: VaultPath, to: VaultPath): Promise<void>
  exists(path: VaultPath): Promise<boolean>
}
```

## `FileWatcher`

```ts
interface ExternalChange {
  kind: "created" | "modified" | "removed"
  path: VaultPath
}

interface FileWatcher {
  /**
   * Eventos de mudança feitos fora do app. Eventos que casam com o ledger de
   * escritas do próprio app nunca chegam aqui (FR-023). Devolve a função de cancelar.
   */
  subscribe(listener: (changes: ExternalChange[]) => void): () => void
}
```

- Os eventos chegam agrupados (debounce do adapter) e ignoram caminhos com segmento iniciado por `.`.
- **Raiz do vault removida ou inacessível**: o observador emite `{ kind: "removed", path: "" }`
  (`""` = a própria raiz). Depois disso, nenhum outro evento é emitido para esse vault.
- Adapter `memory`: expõe `simulateExternal(change, content?, { silent? })` só para testes.
  `simulateExternal({ kind: "removed", path: "" })` simula a raiz sumindo e faz as chamadas
  seguintes a `VaultStorage` rejeitarem com `vault-unavailable`. Com `silent: true`, altera o
  conteúdo sem emitir o evento (alteração que o observador ainda não avisou).

## `Trash`

```ts
interface Trash {
  /** Envia nota ou pasta para a lixeira do sistema (RN-NOTA-001, RN-NOTA-009). */
  moveToTrash(path: VaultPath): Promise<void>
}
```

- Se a lixeira não estiver disponível, rejeita com `"trash-unavailable"` **sem** alterar nada
  (FR-024). Nunca cai para exclusão definitiva.
- Adapter `memory`: guarda os caminhos removidos e aceita `setAvailable(false)` para testes.

## Extras do adapter `memory` (só testes e `dev:mock`)

Não fazem parte do contrato e não existem no adapter Tauri:

| Extra | Efeito |
| --- | --- |
| `createMemoryVaultSession(seed?, { lastOpened?, pickResult? })` | Monta a sessão; `pickResult: null` simula o cancelamento do seletor |
| `simulateExternal(change, content?, { silent? })` | Alteração externa (ver `FileWatcher`) |
| `trash.setAvailable(boolean)` / `trash.removed` | Lixeira indisponível / o que foi para a lixeira |
| `failWritesOn(paths)` | `writeText` e `move` desses caminhos rejeitam com `io`, sem alterar nada (FR-020) |
| `runBeforeClose()` | Executa as tarefas registradas em `onBeforeClose` |
| `window.__devnotesMock` | Só no `pnpm dev:mock`: expõe `simulateExternal` para o Playwright; nunca entra no build |

## Comandos Rust (internos ao adapter `tauri`)

Não fazem parte do contrato público; só `shared/vault/adapters/tauri/` os chama. `open(root)` não
tem comando próprio: o adapter compara `root` com a raiz liberada pelo último `vault_pick` ou
`vault_restore` e confere se ela existe. Todo caminho
recebido é canonizado e rejeitado se estiver fora da raiz do vault aberto (research R4).

| Comando | Entrada | Saída | Research |
| --- | --- | --- | --- |
| `vault_pick` | — | caminho absoluto ou `null` | R3 |
| `vault_restore` | — | `{ root, lastOpenedAt, exists }` ou `null` (libera o escopo só se `exists`) | R3 |
| `vault_scan` | — | `VaultEntry[]` | R4 |
| `vault_read_notes` | `VaultPath[]` | `{ path, content }[]`, com o BOM; o que sumiu fica de fora | R4 |
| `vault_trash` | `VaultPath` | — ou erro `trash-unavailable` | R6 |

## Regras transversais

- Nenhum método aceita caminho fora da raiz (`..`, absoluto): rejeita com `"invalid-name"`.
- Toda gravação, movimentação e envio à lixeira feita pelo app entra no ledger antes da chamada
  ao sistema.
- A interface não expõe conteúdo binário; `other` só aparece em `list()`.
- No adapter Tauri, `readText` e o observador leem pelo `vault_read_notes`, e não
  pelo `readTextFile` do plugin, que descarta o BOM ao decodificar.
