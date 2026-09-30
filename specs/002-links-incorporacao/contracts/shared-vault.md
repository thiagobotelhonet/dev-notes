# Contrato: mudanças em `shared/vault`

**Base**: [contrato da 001](../../001-vault-notas/contracts/shared-vault.md). Só o que muda está
aqui; o resto continua valendo. Toda capacidade nova entra nos dois adapters e na suíte de
contrato (constituição, princípio III).

## `VaultEntry.modifiedAt`

```ts
interface VaultEntry {
  path: VaultPath
  kind: EntryKind
  name: string
  /** Data de modificação do arquivo, em ms desde 1970. Pastas: 0. */
  modifiedAt: number
}
```

- `list()` devolve `modifiedAt` de cada entrada.
- Adapter Tauri: vem do `vault_scan` (metadado do sistema de arquivos).
- Adapter de memória: guarda a hora de cada `writeText`, `move` e `simulateExternal`; o seed nasce
  com horários crescentes na ordem das chaves, para os testes de ordenação serem determinísticos.
  Aceita `options.modifiedAt?: Record<VaultPath, number>` para fixar horários no teste.

## `AppDataStore` (novo)

```ts
interface OpenVault {
  // ...o que já existe na 001
  /** Dados do app deste vault, em `<raiz>/.devnotes/<name>`. */
  appData: AppDataStore
}

interface AppDataStore {
  /** Conteúdo do arquivo, ou `null` se ele não existir. */
  read(name: string): Promise<string | null>
  /** Cria `.devnotes/` se preciso e grava o arquivo inteiro. */
  write(name: string, content: string): Promise<void>
}
```

- `name` só aceita `^[a-z0-9-]+\.json$`; qualquer outro rejeita com `invalid-name`.
- Nada em `.devnotes/` aparece em `list()` nem chega ao `FileWatcher` (já era assim na 001).
- Adapter de memória: guarda no mesmo `Map` dos arquivos, em `.devnotes/<name>`, como a pasta real
  (o seed pode trazer um `.devnotes/deleted-notes.json`); expõe `appDataFiles()` para inspeção em
  teste.

## Comandos Rust novos (internos ao adapter Tauri)

| Comando | Entrada | Saída |
| --- | --- | --- |
| `vault_app_data_read` | `name` | conteúdo ou `null` |
| `vault_app_data_write` | `name`, `content` | — |

- Validam o nome e resolvem sempre `<raiz>/.devnotes/<name>`, sem passar pelo escopo do
  `plugin-fs`. Motivo: no Unix o escopo `raiz/**` não cobre pastas iniciadas por ponto (research
  R4).
- Entram na `capabilities/default.json` como `allow-vault-app-data-read` e
  `allow-vault-app-data-write`, e no `build.rs`.

## `vault_scan`

Passa a devolver `modifiedAt` em cada entrada.

## Casos novos na suíte de contrato

- `list()` traz `modifiedAt` e ele aumenta depois de um `writeText`.
- `appData.read` de arquivo inexistente devolve `null`; `write` seguido de `read` devolve o mesmo
  conteúdo; nome fora do padrão rejeita com `invalid-name`; o arquivo não aparece em `list()`.
