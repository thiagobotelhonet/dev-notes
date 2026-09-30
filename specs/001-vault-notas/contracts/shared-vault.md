# Contrato: `shared/vault` (ports)

**Feature**: [../spec.md](../spec.md) · **Modelo**: [../data-model.md](../data-model.md)

Ponto único de acesso ao sistema operacional (constituição, princípio III). Features, componentes e
stores importam **só** daqui; nunca de `@tauri-apps/*`.

Dois adapters implementam todas as interfaces com o mesmo comportamento observável:

| Adapter | Onde roda | Uso |
| --- | --- | --- |
| `tauri` | App desktop | Produção |
| `memory` | Navegador e Node | Vitest, Playwright, `pnpm dev:mock` |

Uma **suíte de contrato** única (`shared/vault/tests/vault-contract.test.ts`) roda contra os dois
adapters; o adapter Tauri roda essa suíte num teste de integração opcional no CI desktop.

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
  /** Abre a pasta como vault e garante acesso a ela nas próximas execuções. */
  open(root: string): Promise<OpenVault>
  /** Último vault aberto, se ainda acessível (FR-001). */
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
  readText(path: VaultPath): Promise<string>
  /** Leitura em lote para montar o índice de links (research R4). */
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
- Adapter `memory`: expõe `simulateExternal(change, content?)` só para testes;
  `simulateExternal({ kind: "removed", path: "" })` simula a raiz sumindo e faz as chamadas
  seguintes a `VaultStorage` rejeitarem com `vault-unavailable`.

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

## Comandos Rust (internos ao adapter `tauri`)

Não fazem parte do contrato público; só `shared/vault/adapters/tauri/` os chama. Todo caminho
recebido é canonizado e rejeitado se estiver fora da raiz do vault aberto (research R4).

| Comando | Entrada | Saída | Research |
| --- | --- | --- | --- |
| `vault_pick` | — | caminho absoluto ou `null` | R3 |
| `vault_restore` | — | caminho absoluto ou `null` | R3 |
| `vault_scan` | — | `VaultEntry[]` | R4 |
| `vault_read_notes` | `VaultPath[]` | `{ path, content }[]` | R4 |
| `vault_trash` | `VaultPath` | — ou erro `trash-unavailable` | R6 |

## Regras transversais

- Nenhum método aceita caminho fora da raiz (`..`, absoluto): rejeita com `"invalid-name"`.
- Toda gravação, movimentação e envio à lixeira feita pelo app entra no ledger antes da chamada
  ao sistema.
- A interface não expõe conteúdo binário; `other` só aparece em `list()`.
