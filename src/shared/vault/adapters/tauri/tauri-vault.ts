import { invoke, isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import {
  exists,
  mkdir,
  rename,
  stat,
  type WatchEvent,
  watch,
  writeTextFile,
} from "@tauri-apps/plugin-fs"
import { sha256Hex } from "@/shared/lib/hash"
import { createWriteLedger } from "../../vault.ledger"
import {
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
  type VaultErrorCode,
  type VaultPath,
  type VaultRef,
  type VaultSession,
  type VaultStorage,
} from "../../vault.types"

const watchDelayMs = 300
/** Ledger "hash" of a folder, which has no content of its own. */
const folderMarker = "folder"
const codes: VaultErrorCode[] = [
  "not-found",
  "already-exists",
  "invalid-name",
  "permission-denied",
  "trash-unavailable",
  "vault-unavailable",
  "io",
]

function toVaultError(error: unknown, path?: VaultPath): VaultError {
  if (error instanceof VaultError) return error
  const text = String(error)
  if (codes.includes(text as VaultErrorCode))
    return new VaultError(text as VaultErrorCode, path)
  if (
    /os error 2\b|os error 3\b|not found|no such file|cannot find/i.test(text)
  )
    return new VaultError("not-found", path)
  if (/forbidden|denied|os error 5\b|os error 13\b|permission/i.test(text))
    return new VaultError("permission-denied", path)
  return new VaultError("io", path)
}

const folderName = (root: string) =>
  root
    .replace(/[\\/]+$/, "")
    .split(/[\\/]/)
    .pop() ?? root

interface RestoredVault {
  root: string
  lastOpenedAt: string
  exists: boolean
}

/** Outside the desktop app (plain browser) the session is unavailable. */
export function createTauriVaultSession(): VaultSession {
  if (!isTauri()) throw new VaultError("vault-unavailable")
  let grantedRoot: string | null = null

  return {
    async pickFolder() {
      try {
        const root = await invoke<string | null>("vault_pick")
        if (root) grantedRoot = root
        return root
      } catch (error) {
        throw toVaultError(error)
      }
    },
    async lastOpened() {
      try {
        const restored = await invoke<RestoredVault | null>("vault_restore")
        if (!restored) return null
        grantedRoot = restored.exists ? restored.root : null
        return {
          root: restored.root,
          name: folderName(restored.root),
          lastOpenedAt: restored.lastOpenedAt,
        }
      } catch (error) {
        throw toVaultError(error)
      }
    },
    async open(root) {
      if (root !== grantedRoot || !(await exists(root).catch(() => false)))
        throw new VaultError("vault-unavailable")
      return openTauriVault({
        root,
        name: folderName(root),
        lastOpenedAt: new Date().toISOString(),
      })
    },
  }
}

function openTauriVault(ref: VaultRef): OpenVault {
  const root = ref.root.replace(/[\\/]+$/, "")
  const ledger = createWriteLedger()
  const known = new Set<VaultPath>()
  const listeners = new Set<(changes: ExternalChange[]) => void>()
  const beforeClose = new Set<() => Promise<void>>()
  let unwatch: (() => void) | null = null
  let rootGone = false

  const absolute = (path: VaultPath) => (path === "" ? root : `${root}/${path}`)
  const rootKey = root.replace(/\\/g, "/").toLowerCase()
  const relative = (osPath: string): VaultPath | null => {
    const slashed = osPath.replace(/\\/g, "/")
    if (slashed.toLowerCase() === rootKey) return ""
    if (!slashed.toLowerCase().startsWith(`${rootKey}/`)) return null
    return slashed.slice(rootKey.length + 1)
  }
  const checked = (path: VaultPath) => {
    if (rootGone) throw new VaultError("vault-unavailable")
    const normalized = normalizeVaultPath(path)
    if (normalized === "") throw new VaultError("invalid-name", path)
    return normalized
  }
  /** Maps an error, reporting "vault-unavailable" when the root is gone. */
  const fail = async (error: unknown, path?: VaultPath) => {
    if (!(await exists(root).catch(() => false)))
      return new VaultError("vault-unavailable", path)
    return toVaultError(error, path)
  }
  const siblingWithKey = (path: VaultPath, except?: VaultPath) => {
    const key = nameKey(path.slice(path.lastIndexOf("/") + 1))
    return [...known].find(
      (other) =>
        other !== except &&
        parentOf(other) === parentOf(path) &&
        nameKey(other.slice(other.lastIndexOf("/") + 1)) === key
    )
  }
  const addKnown = (path: VaultPath) => {
    for (let current = path; current !== ""; current = parentOf(current))
      known.add(current)
  }
  const forgetTree = (path: VaultPath) => {
    for (const item of [...known]) if (isInside(item, path)) known.delete(item)
  }

  /* Read through Rust: the fs plugin's readTextFile drops the BOM (FR-004). */
  const readWhole = async (path: VaultPath) => {
    const [file] = await invoke<{ path: VaultPath; content: string }[]>(
      "vault_read_notes",
      { paths: [path] }
    )
    if (!file) throw new VaultError("not-found", path)
    return file.content
  }

  const storage: VaultStorage = {
    async list() {
      if (rootGone) throw new VaultError("vault-unavailable")
      try {
        const entries = await invoke<VaultEntry[]>("vault_scan")
        known.clear()
        for (const entry of entries) known.add(entry.path)
        return entries
      } catch (error) {
        throw await fail(error)
      }
    },
    async readText(path) {
      const target = checked(path)
      try {
        return await readWhole(target)
      } catch (error) {
        throw await fail(error, target)
      }
    },
    async readMany(paths) {
      const targets = paths.map(checked)
      try {
        return await invoke<{ path: VaultPath; content: string }[]>(
          "vault_read_notes",
          { paths: targets }
        )
      } catch (error) {
        throw await fail(error)
      }
    },
    async writeText(path, content) {
      const target = checked(path)
      try {
        const parent = parentOf(target)
        if (parent !== "" && !(await exists(absolute(parent)))) {
          for (
            let current = parent;
            current !== "";
            current = parentOf(current)
          )
            ledger.record(current, folderMarker)
          await mkdir(absolute(parent), { recursive: true })
        }
        ledger.record(target, await sha256Hex(content))
        await writeTextFile(absolute(target), content)
        addKnown(target)
      } catch (error) {
        throw await fail(error, target)
      }
    },
    async createFolder(path) {
      const target = checked(path)
      if (siblingWithKey(target) || (await exists(absolute(target))))
        throw new VaultError("already-exists", target)
      try {
        ledger.record(target, folderMarker)
        await mkdir(absolute(target))
        addKnown(target)
      } catch (error) {
        throw await fail(error, target)
      }
    },
    async move(from, to) {
      const source = checked(from)
      const target = checked(to)
      const caseOnly =
        parentOf(source) === parentOf(target) &&
        nameKey(source) === nameKey(target) &&
        source !== target
      if (
        !caseOnly &&
        (siblingWithKey(target, source) || (await exists(absolute(target))))
      )
        throw new VaultError("already-exists", target)
      try {
        ledger.recordTree(source)
        ledger.recordTree(target)
        if (caseOnly) {
          /* Case-only renames are unreliable on FAT/exFAT and SMB (research R8). */
          const temporary = `${source}.devnotes-tmp-${Date.now().toString(36)}`
          ledger.recordTree(temporary)
          await rename(absolute(source), absolute(temporary))
          await rename(absolute(temporary), absolute(target))
        } else {
          await rename(absolute(source), absolute(target))
        }
        const moved = [...known].filter((item) => isInside(item, source))
        forgetTree(source)
        for (const item of moved) known.add(target + item.slice(source.length))
        addKnown(target)
      } catch (error) {
        throw await fail(error, source)
      }
    },
    async exists(path) {
      const target = checked(path)
      return exists(absolute(target))
    },
  }

  /* Through Rust commands: on Unix the fs scope does not cover dot folders (research R4). */
  const appDataName = (name: string) => {
    if (rootGone) throw new VaultError("vault-unavailable")
    if (!appDataNamePattern.test(name))
      throw new VaultError("invalid-name", name)
    return name
  }
  const appData: AppDataStore = {
    async read(name) {
      const checkedName = appDataName(name)
      try {
        return await invoke<string | null>("vault_app_data_read", {
          name: checkedName,
        })
      } catch (error) {
        throw await fail(error, `.devnotes/${checkedName}`)
      }
    },
    async write(name, content) {
      const checkedName = appDataName(name)
      const path = `.devnotes/${checkedName}`
      ledger.record(path, await sha256Hex(content))
      try {
        await invoke("vault_app_data_write", { name: checkedName, content })
      } catch (error) {
        throw await fail(error, path)
      }
    },
  }

  const currentHash = async (path: VaultPath) => {
    const target = absolute(path)
    if (!(await exists(target))) return null
    const info = await stat(target)
    if (info.isDirectory) return folderMarker
    if (kindOf(path) === "other") return "file"
    return sha256Hex(await readWhole(path))
  }

  const emit = (changes: ExternalChange[]) => {
    if (changes.length) for (const listener of listeners) listener(changes)
  }

  const rootRemoved = () => {
    if (rootGone) return
    rootGone = true
    unwatch?.()
    unwatch = null
    emit([{ kind: "removed", path: "" }])
  }

  const rescan = async () => {
    const before = new Set(known)
    const entries = await storage.list()
    const now = new Set(entries.map((entry) => entry.path))
    emit([
      ...[...now]
        .filter((path) => !before.has(path))
        .map((path) => ({ kind: "created" as const, path })),
      ...[...before]
        .filter((path) => !now.has(path))
        .map((path) => ({ kind: "removed" as const, path })),
    ])
  }

  /** Events are only hints: the real state decides (research R5). */
  const handle = async (event: WatchEvent) => {
    if (rootGone) return
    if (!(await exists(root).catch(() => false))) return rootRemoved()
    const attrs = event.attrs as { flag?: string } | null
    if (attrs?.flag === "rescan") return rescan()
    const changes: ExternalChange[] = []
    const paths = [...new Set(event.paths.map(relative))].filter(
      (path): path is VaultPath =>
        path !== null && path !== "" && !isHiddenPath(path)
    )
    /* Notes and canvases of one event in a single read (SC-002, SC-004). */
    const texts = new Map<VaultPath, string>()
    const textPaths = paths.filter((path) => kindOf(path) !== "other")
    if (textPaths.length)
      await invoke<{ path: VaultPath; content: string }[]>("vault_read_notes", {
        paths: textPaths,
      }).then(
        (files) => {
          for (const file of files) texts.set(file.path, file.content)
        },
        () => {}
      )
    for (const path of paths) {
      try {
        const text = texts.get(path)
        const hash =
          text === undefined ? await currentHash(path) : await sha256Hex(text)
        if (ledger.matches(path, hash)) continue
        if (hash === null) {
          if (!known.has(path)) continue
          forgetTree(path)
          changes.push({ kind: "removed", path })
        } else if (!known.has(path)) {
          addKnown(path)
          changes.push({ kind: "created", path })
        } else if (hash !== folderMarker) {
          changes.push({ kind: "modified", path })
        }
      } catch {
        /* The file changed again while being read; the next event covers it. */
      }
    }
    emit(changes)
  }

  let queue = Promise.resolve()
  watch(
    root,
    (event) => {
      queue = queue.then(() => handle(event))
    },
    { recursive: true, delayMs: watchDelayMs }
  ).then(
    (stop) => {
      if (rootGone) stop()
      else unwatch = stop
    },
    () => rootRemoved()
  )

  /* A page reload does not run close(); stop watching so Rust drops it. */
  const stopOnUnload = () => unwatch?.()
  window.addEventListener("beforeunload", stopOnUnload)

  let unlistenClose: (() => void) | null = null
  getCurrentWindow()
    .onCloseRequested(async (event) => {
      const results = await Promise.allSettled(
        [...beforeClose].map((task) => task())
      )
      /* A failed save keeps the window open instead of losing the edit. */
      if (results.some((result) => result.status === "rejected"))
        event.preventDefault()
    })
    .then((unlisten) => {
      unlistenClose = unlisten
    })

  return {
    ref,
    storage,
    watcher: {
      subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    },
    appData,
    trash: {
      async moveToTrash(path) {
        const target = checked(path)
        ledger.recordTree(target)
        try {
          await invoke("vault_trash", { path: target })
          forgetTree(target)
        } catch (error) {
          throw await fail(error, target)
        }
      },
    },
    onBeforeClose(task) {
      beforeClose.add(task)
      return () => beforeClose.delete(task)
    },
    async close() {
      window.removeEventListener("beforeunload", stopOnUnload)
      unwatch?.()
      unwatch = null
      unlistenClose?.()
      listeners.clear()
    },
  }
}
