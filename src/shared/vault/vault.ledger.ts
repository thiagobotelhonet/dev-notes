import { isInside } from "./vault.paths"
import type { VaultPath } from "./vault.types"

const defaultTtlMs = 2000

interface LedgerEntry {
  path: VaultPath
  /** Expected content hash; `null` = the path no longer exists. */
  hash: string | null
  /** Any change at or below `path` belongs to the app (folder moves). */
  tree: boolean
  expiresAt: number
}

/** Writes made by the app, so the watcher can ignore their echo (FR-023). */
export function createWriteLedger(ttlMs = defaultTtlMs) {
  let entries: LedgerEntry[] = []
  const prune = () => {
    const now = Date.now()
    entries = entries.filter((entry) => entry.expiresAt > now)
  }
  const add = (entry: Omit<LedgerEntry, "expiresAt">) => {
    prune()
    entries.push({ ...entry, expiresAt: Date.now() + ttlMs })
  }
  return {
    record(path: VaultPath, hash: string | null) {
      add({ path, hash, tree: false })
    },
    recordTree(path: VaultPath) {
      add({ path, hash: null, tree: true })
    },
    matches(path: VaultPath, currentHash: string | null) {
      prune()
      return entries.some((entry) =>
        entry.tree
          ? isInside(path, entry.path)
          : entry.path === path && entry.hash === currentHash
      )
    },
  }
}

export type WriteLedger = ReturnType<typeof createWriteLedger>
