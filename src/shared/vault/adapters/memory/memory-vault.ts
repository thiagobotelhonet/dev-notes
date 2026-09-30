import { sha256Hex } from "@/shared/lib/hash"
import { createWriteLedger } from "../../vault.ledger"
import {
  basenameOf,
  isHiddenPath,
  isInside,
  kindOf,
  nameKey,
  normalizeVaultPath,
  parentOf,
} from "../../vault.paths"
import {
  type AppDataStore,
  appDataNamePattern,
  type ExternalChange,
  type OpenVault,
  type VaultEntry,
  VaultError,
  type VaultPath,
  type VaultRef,
  type VaultSession,
  type VaultStorage,
} from "../../vault.types"

export const memoryVaultRoot = "/memory-vault"

export interface MemoryVaultOptions {
  lastOpened?: VaultRef | null
  /** `null` simulates the user cancelling the folder picker. */
  pickResult?: string | null
  /** Fixed modification times, for tests that sort by them. */
  modifiedAt?: Record<VaultPath, number>
}

export interface MemoryVaultSession extends VaultSession {
  /** Outside change; with `silent` the watcher is not told yet. */
  simulateExternal(
    change: ExternalChange,
    content?: string,
    options?: { silent?: boolean }
  ): Promise<void>
  trash: {
    setAvailable(available: boolean): void
    readonly removed: VaultPath[]
  }
  /** `writeText` and `move` on these paths reject with "io" (FR-020). */
  failWritesOn(paths: VaultPath[]): void
  runBeforeClose(): Promise<void>
  /** Waits until pending watcher deliveries are done. */
  flushEvents(): Promise<void>
  /** Current file contents, for assertions. */
  files(): Record<VaultPath, string>
  /** Files of `.devnotes/` by name, for assertions. */
  appDataFiles(): Record<string, string>
}

/** Own writes also reach the watcher and are dropped by the ledger, as on Tauri. */
export function createMemoryVaultSession(
  seed: Record<VaultPath, string> = {},
  options: MemoryVaultOptions = {}
): MemoryVaultSession {
  const files = new Map<VaultPath, string>()
  const modified = new Map<VaultPath, number>()
  /* Strictly increasing, so ordering by modifiedAt is deterministic. */
  let clock = 0
  const tick = () => {
    clock = Math.max(Date.now(), clock + 1)
    return clock
  }
  const touch = (path: VaultPath) =>
    modified.set(path, options.modifiedAt?.[path] ?? tick())
  const folders = new Set<VaultPath>()
  const ledger = createWriteLedger()
  const listeners = new Set<(changes: ExternalChange[]) => void>()
  const beforeClose = new Set<() => Promise<void>>()
  const removed: VaultPath[] = []
  let failing = new Set<VaultPath>()
  let trashAvailable = true
  let rootGone = false
  let pending: Promise<void> = Promise.resolve()
  let lastOpened: VaultRef | null = options.lastOpened ?? null
  const pickResult =
    "pickResult" in options ? (options.pickResult ?? null) : memoryVaultRoot

  const addFolderChain = (folder: VaultPath) => {
    for (let current = folder; current !== ""; current = parentOf(current))
      folders.add(current)
  }
  for (const [path, content] of Object.entries(seed)) {
    files.set(path, content)
    touch(path)
    addFolderChain(parentOf(path))
  }

  const ensureRoot = () => {
    if (rootGone) throw new VaultError("vault-unavailable")
  }
  const checked = (path: VaultPath) => {
    ensureRoot()
    const normalized = normalizeVaultPath(path)
    if (normalized === "") throw new VaultError("invalid-name", path)
    return normalized
  }
  const existsAt = (path: VaultPath) => files.has(path) || folders.has(path)
  const siblingWithKey = (path: VaultPath, except?: VaultPath) => {
    const parent = parentOf(path)
    const key = nameKey(path.slice(path.lastIndexOf("/") + 1))
    return [...files.keys(), ...folders].find(
      (other) =>
        other !== except &&
        parentOf(other) === parent &&
        nameKey(other.slice(other.lastIndexOf("/") + 1)) === key
    )
  }

  const deliver = (changes: ExternalChange[]) => {
    pending = pending.then(async () => {
      const external: ExternalChange[] = []
      for (const change of changes) {
        if (change.path !== "" && isHiddenPath(change.path)) continue
        const content = files.get(change.path)
        const hash = content === undefined ? null : await sha256Hex(content)
        if (change.path === "" || !ledger.matches(change.path, hash))
          external.push(change)
      }
      if (external.length) for (const listener of listeners) listener(external)
    })
  }

  const storage: VaultStorage = {
    async list() {
      ensureRoot()
      const entries: VaultEntry[] = [
        ...[...folders].map((path) => ({
          path,
          kind: "folder" as const,
          name: path.slice(path.lastIndexOf("/") + 1),
          modifiedAt: 0,
        })),
        ...[...files.keys()].map((path) => ({
          path,
          kind: kindOf(path),
          name: basenameOf(path),
          modifiedAt: modified.get(path) ?? 0,
        })),
      ]
      return entries
        .filter((entry) => !isHiddenPath(entry.path))
        .sort((a, b) => a.path.localeCompare(b.path))
    },
    async readText(path) {
      const target = checked(path)
      const content = files.get(target)
      if (content === undefined) throw new VaultError("not-found", target)
      return content
    },
    async readMany(paths) {
      ensureRoot()
      return paths
        .map((path) => checked(path))
        .filter((path) => files.has(path))
        .map((path) => ({ path, content: files.get(path) ?? "" }))
    },
    async writeText(path, content) {
      const target = checked(path)
      if (failing.has(target)) throw new VaultError("io", target)
      if (folders.has(target)) throw new VaultError("already-exists", target)
      const created = !files.has(target)
      ledger.record(target, await sha256Hex(content))
      addFolderChain(parentOf(target))
      files.set(target, content)
      modified.set(target, tick())
      deliver([{ kind: created ? "created" : "modified", path: target }])
    },
    async createFolder(path) {
      const target = checked(path)
      if (siblingWithKey(target)) throw new VaultError("already-exists", target)
      if (!folders.has(parentOf(target)) && parentOf(target) !== "")
        throw new VaultError("not-found", parentOf(target))
      ledger.record(target, null)
      folders.add(target)
    },
    async move(from, to) {
      const source = checked(from)
      const target = checked(to)
      if (failing.has(source) || failing.has(target))
        throw new VaultError("io", source)
      if (!existsAt(source)) throw new VaultError("not-found", source)
      if (siblingWithKey(target, source))
        throw new VaultError("already-exists", target)
      const targetParent = parentOf(target)
      if (targetParent !== "" && !folders.has(targetParent))
        throw new VaultError("not-found", targetParent)
      if (isInside(target, source) && target !== source)
        throw new VaultError("invalid-name", target)
      ledger.recordTree(source)
      ledger.recordTree(target)
      const rename = (path: VaultPath) => target + path.slice(source.length)
      for (const path of [...files.keys()].filter((p) => isInside(p, source))) {
        const content = files.get(path) ?? ""
        files.delete(path)
        modified.delete(path)
        files.set(rename(path), content)
        modified.set(rename(path), tick())
      }
      for (const path of [...folders].filter((p) => isInside(p, source))) {
        folders.delete(path)
        folders.add(rename(path))
      }
      deliver([
        { kind: "removed", path: source },
        { kind: "created", path: target },
      ])
    },
    async exists(path) {
      return existsAt(checked(path))
    },
  }

  const removeTree = (path: VaultPath) => {
    for (const file of [...files.keys()])
      if (isInside(file, path)) {
        files.delete(file)
        modified.delete(file)
      }
    for (const folder of [...folders])
      if (isInside(folder, path)) folders.delete(folder)
  }

  /* Kept in the same map as the notes, under `.devnotes/`, like the real folder. */
  const appDataPath = (name: string) => {
    ensureRoot()
    if (!appDataNamePattern.test(name))
      throw new VaultError("invalid-name", name)
    return `.devnotes/${name}`
  }
  const appData: AppDataStore = {
    async read(name) {
      return files.get(appDataPath(name)) ?? null
    },
    async write(name, content) {
      const target = appDataPath(name)
      ledger.record(target, await sha256Hex(content))
      files.set(target, content)
      modified.set(target, tick())
    },
  }

  const trash = {
    setAvailable(available: boolean) {
      trashAvailable = available
    },
    get removed() {
      return removed
    },
    async moveToTrash(path: VaultPath) {
      const target = checked(path)
      if (!trashAvailable) throw new VaultError("trash-unavailable", target)
      if (!existsAt(target)) throw new VaultError("not-found", target)
      ledger.recordTree(target)
      removeTree(target)
      removed.push(target)
      deliver([{ kind: "removed", path: target }])
    },
  }

  const session: MemoryVaultSession = {
    async pickFolder() {
      return pickResult
    },
    async lastOpened() {
      return lastOpened
    },
    async open(root) {
      if (root !== memoryVaultRoot || rootGone)
        throw new VaultError("vault-unavailable")
      const ref: VaultRef = {
        root,
        name:
          lastOpened?.root === root
            ? lastOpened.name
            : root.slice(root.lastIndexOf("/") + 1),
        lastOpenedAt: new Date().toISOString(),
      }
      lastOpened = ref
      const vault: OpenVault = {
        ref,
        storage,
        watcher: {
          subscribe(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
          },
        },
        trash,
        appData,
        onBeforeClose(task) {
          beforeClose.add(task)
          return () => beforeClose.delete(task)
        },
        async close() {
          listeners.clear()
        },
      }
      return vault
    },
    async simulateExternal(change, content, simulation = {}) {
      if (change.kind === "removed" && change.path === "") {
        rootGone = true
        files.clear()
        folders.clear()
      } else if (change.kind === "removed") {
        removeTree(change.path)
      } else {
        addFolderChain(parentOf(change.path))
        files.set(change.path, content ?? "")
        modified.set(change.path, tick())
      }
      if (!simulation.silent) deliver([change])
      await pending
    },
    trash,
    failWritesOn(paths) {
      failing = new Set(paths)
    },
    async runBeforeClose() {
      await Promise.all([...beforeClose].map((task) => task()))
    },
    async flushEvents() {
      await pending
    },
    files() {
      return Object.fromEntries(files)
    },
    appDataFiles() {
      return Object.fromEntries(
        [...files]
          .filter(([path]) => path.startsWith(".devnotes/"))
          .map(([path, content]) => [path.slice(".devnotes/".length), content])
      )
    },
  }
  return session
}
