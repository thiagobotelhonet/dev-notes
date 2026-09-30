/** Relative to the vault root, "/"-separated, no leading "/", no "." or "..". */
export type VaultPath = string

export type EntryKind = "folder" | "note" | "canvas" | "other"

export interface VaultEntry {
  path: VaultPath
  kind: EntryKind
  name: string
  /** Modification time of the file, in ms since 1970. Folders: 0. */
  modifiedAt: number
}

export interface VaultRef {
  root: string
  name: string
  lastOpenedAt: string
}

export type VaultErrorCode =
  | "not-found"
  | "already-exists"
  | "invalid-name"
  | "permission-denied"
  | "trash-unavailable"
  | "vault-unavailable"
  | "io"

export class VaultError extends Error {
  readonly code: VaultErrorCode
  readonly path?: VaultPath

  constructor(code: VaultErrorCode, path?: VaultPath) {
    super(path === undefined ? code : `${code}: ${path}`)
    this.name = "VaultError"
    this.code = code
    this.path = path
  }
}

export function isVaultError(
  error: unknown,
  code?: VaultErrorCode
): error is VaultError {
  return (
    error instanceof VaultError && (code === undefined || error.code === code)
  )
}

/** `path: ""` with `kind: "removed"` means the vault root itself is gone. */
export interface ExternalChange {
  kind: "created" | "modified" | "removed"
  path: VaultPath
}

export interface VaultSession {
  /** System folder picker; `null` when the user cancels. */
  pickFolder(): Promise<string | null>
  /** Only accepts a root that came from `pickFolder` or `lastOpened`. */
  open(root: string): Promise<OpenVault>
  /** Last opened vault, even if its folder no longer exists (FR-001). */
  lastOpened(): Promise<VaultRef | null>
}

export interface OpenVault {
  ref: VaultRef
  storage: VaultStorage
  watcher: FileWatcher
  trash: Trash
  /** App data of this vault, in `<root>/.devnotes/<name>` (ADR-009). */
  appData: AppDataStore
  /** Runs before the app closes; closing waits for every task. */
  onBeforeClose(task: () => Promise<void>): () => void
  close(): Promise<void>
}

export interface VaultStorage {
  /** Recursive; skips any name starting with "." (FR-002). */
  list(): Promise<VaultEntry[]>
  readText(path: VaultPath): Promise<string>
  /** In the requested order; a file that vanished is left out. */
  readMany(paths: VaultPath[]): Promise<{ path: VaultPath; content: string }[]>
  /** Records the write in the ledger (FR-023) and creates missing parents. */
  writeText(path: VaultPath, content: string): Promise<void>
  /** "already-exists" when a sibling has the same nameKey. */
  createFolder(path: VaultPath): Promise<void>
  /** Renames or moves a file or folder; a case-only rename is allowed. */
  move(from: VaultPath, to: VaultPath): Promise<void>
  exists(path: VaultPath): Promise<boolean>
}

export interface FileWatcher {
  /** Changes made outside the app only. Returns the unsubscribe function. */
  subscribe(listener: (changes: ExternalChange[]) => void): () => void
}

/** Files of `.devnotes/`; a name outside `appDataNamePattern` rejects with "invalid-name". */
export interface AppDataStore {
  /** The content, or `null` when the file does not exist. */
  read(name: string): Promise<string | null>
  /** Creates `.devnotes/` when needed and writes the whole file. */
  write(name: string, content: string): Promise<void>
}

/** Only a file name: the folder is always `.devnotes/` (ADR-009). */
export const appDataNamePattern = /^[a-z0-9-]+\.json$/

export interface Trash {
  /** OS trash only; "trash-unavailable" leaves everything untouched. */
  moveToTrash(path: VaultPath): Promise<void>
}
