import { toast } from "sonner"
import { create } from "zustand"
import {
  affectedByMoves,
  createLinkIndex,
  type DeletedNotes,
  type EntryMove,
  fileMoves,
  type LinkIndex,
  type LinkOccurrence,
  parseDeletedNotes,
  planChange,
  resolveLinkTarget,
  serializeDeletedNotes,
  withDeleted,
  withoutExisting,
} from "@/features/links"
import {
  type ExternalChange,
  getVaultSession,
  isInside,
  isVaultError,
  joinVaultPath,
  kindOf,
  type OpenVault,
  parentOf,
  type VaultEntry,
  type VaultPath,
  type VaultRef,
  type VaultSession,
} from "@/shared/vault"
import { validateName } from "./model/vault.names"
import {
  applyChangePlan,
  conflictMessage,
  createFolder,
  createNote,
  entryFor,
  messages,
  siblingNamed,
  VaultActionError,
  withEntry,
  withMovedTree,
  withoutTree,
  withTouched,
} from "./model/vault.operations"

export type VaultStatus =
  | "idle"
  | "picking"
  | "loading"
  | "ready"
  | "open-failed"
  | "unavailable"
  | "no-desktop"

export type VaultEvent =
  | { kind: "moved"; from: VaultPath; to: VaultPath }
  | { kind: "removed"; path: VaultPath }
  | { kind: "rewritten"; path: VaultPath }
  | { kind: "external"; change: ExternalChange }

/** What following a link leads to; `app/` turns it into UI (data-model "FollowOutcome"). */
export type FollowOutcome =
  | { type: "open"; path: VaultPath; heading?: string; created?: boolean }
  | { type: "choose"; name: string; candidates: VaultPath[]; heading?: string }
  | { type: "broken"; path: VaultPath }
  | { type: "invalid"; reason: string }
  | { type: "unsupported"; kind: "canvas" | "other" }

export type FollowRequest = Pick<LinkOccurrence, "target" | "subpath">

interface VaultState {
  status: VaultStatus
  ref: VaultRef | null
  entries: VaultEntry[]
  vault: OpenVault | null
  linkIndex: LinkIndex | null
  /** Notes deleted while the app was open; tells a broken link from a pending one (FR-003). */
  deleted: DeletedNotes
  restore(session?: VaultSession): Promise<void>
  pick(): Promise<void>
  refresh(): Promise<void>
  createNote(folder: VaultPath): Promise<VaultPath>
  createFolder(parent: VaultPath, name: string): Promise<VaultPath>
  /** Throws `VaultActionError` with the message for the user. */
  renameEntry(path: VaultPath, newName: string): Promise<void>
  /** Throws `VaultActionError` with the message for the user. */
  moveEntry(path: VaultPath, targetFolder: VaultPath): Promise<void>
  /** `false` when nothing was deleted (trash unavailable). */
  deleteEntry(path: VaultPath): Promise<boolean>
  /** The editor saved a note: refreshes its links and modification time. */
  noteSaved(path: VaultPath, content: string): void
  /** Decides what a link leads to; `from` is the note where it is written. */
  followLink(link: FollowRequest, from: VaultPath): Promise<FollowOutcome>
  /** Recreates a deleted note, empty, at its path; never overwrites. */
  recreateNote(path: VaultPath): Promise<FollowOutcome>
}

const beforeMutateListeners = new Set<(paths: VaultPath[]) => Promise<void>>()
const entryListeners = new Set<(event: VaultEvent) => void>()

/** The operation waits for every listener (the editor saves first). */
export function onBeforeMutate(
  listener: (paths: VaultPath[]) => Promise<void>
) {
  beforeMutateListeners.add(listener)
  return () => beforeMutateListeners.delete(listener)
}

export function onEntryEvent(listener: (event: VaultEvent) => void) {
  entryListeners.add(listener)
  return () => entryListeners.delete(listener)
}

async function runBeforeMutate(paths: VaultPath[]) {
  await Promise.all(
    [...beforeMutateListeners].map((listener) => listener(paths))
  )
}

function emitEntryEvent(event: VaultEvent) {
  for (const listener of entryListeners) listener(event)
}

let session: VaultSession | null = null
let unsubscribeWatcher: (() => void) | null = null
let indexReady: Promise<LinkIndex | null> = Promise.resolve(null)
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let openTicket = 0

const deletedFile = "deleted-notes.json"
const deletedSaveDelayMs = 500
let deletedTimer: ReturnType<typeof setTimeout> | undefined
let pendingDeleted: { vault: OpenVault; notes: DeletedNotes } | null = null

/** Grouped write of the registry; a failure is ignored, it is only an aid (ADR-009). */
async function writeDeleted() {
  clearTimeout(deletedTimer)
  const pending = pendingDeleted
  pendingDeleted = null
  if (pending)
    await pending.vault.appData
      .write(deletedFile, serializeDeletedNotes(pending.notes))
      .catch(() => {})
}

function setDeleted(notes: DeletedNotes) {
  const { vault, deleted } = useVaultStore.getState()
  if (notes === deleted) return
  useVaultStore.setState({ deleted: notes })
  if (!vault) return
  pendingDeleted = { vault, notes }
  clearTimeout(deletedTimer)
  deletedTimer = setTimeout(() => void writeDeleted(), deletedSaveDelayMs)
}

/** Resolves when the link index of the open vault is built. */
export function waitForIndex() {
  return indexReady
}

const indexedKinds = new Set(["note", "canvas"])

export const useVaultStore = create<VaultState>()((set, get) => {
  const unavailable = () => {
    set({ status: "unavailable" })
    toast.error("A pasta do vault não está mais acessível.")
  }

  /** Any operation that finds the root gone switches to "unavailable". */
  const guard = async <T>(action: () => Promise<T>): Promise<T> => {
    try {
      return await action()
    } catch (error) {
      if (isVaultError(error, "vault-unavailable")) unavailable()
      throw error
    }
  }

  const buildIndex = (vault: OpenVault, entries: VaultEntry[]) => {
    set({ linkIndex: null })
    indexReady = vault.storage
      .readMany(
        entries
          .filter((entry) => indexedKinds.has(entry.kind))
          .map((entry) => entry.path)
      )
      .then((files) => {
        if (get().vault !== vault) return null
        const linkIndex = createLinkIndex(
          Object.fromEntries(files.map((file) => [file.path, file.content]))
        )
        set({ linkIndex })
        return linkIndex
      })
      .catch((error) => {
        if (isVaultError(error, "vault-unavailable")) unavailable()
        return null
      })
  }

  const scheduleRefresh = () => {
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      get()
        .refresh()
        .catch(() => {})
    }, 100)
  }

  /** Watcher events are hints; the listing and the files decide. */
  const onExternal = async (changes: ExternalChange[]) => {
    const { vault } = get()
    if (!vault) return
    if (
      changes.some((change) => change.kind === "removed" && change.path === "")
    )
      return unavailable()
    const removedNotes = get()
      .entries.filter(
        (entry) =>
          entry.kind === "note" &&
          changes.some(
            (change) =>
              change.kind === "removed" && isInside(entry.path, change.path)
          )
      )
      .map((entry) => entry.path)
    if (removedNotes.length)
      setDeleted(withDeleted(get().deleted, removedNotes, new Date()))
    if (changes.some((change) => change.kind !== "modified")) scheduleRefresh()
    const linkIndex = await indexReady
    if (get().vault !== vault) return
    for (const change of changes)
      if (change.kind === "removed") {
        for (const path of linkIndex?.notePaths() ?? [])
          if (isInside(path, change.path)) linkIndex?.remove(path)
        linkIndex?.remove(change.path)
      }
    /* One read and one state update per batch: a branch switch can change thousands of notes. */
    const readable = changes
      .filter(
        (change) => change.kind !== "removed" && kindOf(change.path) !== "other"
      )
      .map((change) => change.path)
    if (linkIndex && readable.length) {
      const files = await vault.storage.readMany(readable).catch(() => [])
      if (get().vault !== vault) return
      for (const file of files) linkIndex.update(file.path, file.content)
    }
    const modified = changes
      .filter((change) => change.kind === "modified")
      .map((change) => change.path)
    if (modified.length) set({ entries: withTouched(get().entries, modified) })
    for (const change of changes) emitEntryEvent({ kind: "external", change })
  }

  /** Rename and move share one flow; see the module README. */
  const runMoves = async (moves: EntryMove[]) => {
    const { vault, entries } = get()
    if (!vault) throw new Error("No open vault")
    const index = await indexReady
    if (!index)
      throw new VaultActionError("O índice de links ainda não está pronto.")
    const affected = affectedByMoves(index, entries, moves)
    await runBeforeMutate(affected)
    const readable = affected.filter((path) => kindOf(path) !== "other")
    const files = await guard(() => vault.storage.readMany(readable))
    const contents = Object.fromEntries(
      files.map((file) => [file.path, file.content])
    )
    const plan = await planChange(index, get().entries, contents, moves)
    if (plan.conflicts.length)
      throw new VaultActionError(
        conflictMessage(get().entries, plan.conflicts[0].existing)
      )
    const moved = fileMoves(get().entries, moves)
    const result = await guard(() => applyChangePlan(vault.storage, plan))
    /* The user may have switched vaults meanwhile; this result is stale. */
    if (get().vault !== vault) return plan.updatedLinks
    for (const [from, to] of moved) index.rename(from, to)
    for (const edit of plan.edits)
      if (result.applied.includes(edit.path))
        index.update(edit.path, edit.after)
    let next = get().entries
    for (const move of moves) next = withMovedTree(next, move.from, move.to)
    set({ entries: withTouched(next, result.applied) })
    for (const [from, to] of moved) emitEntryEvent({ kind: "moved", from, to })
    for (const path of result.applied)
      emitEntryEvent({ kind: "rewritten", path })
    if (result.failed.length) toast.error(messages.partial(result.failed))
    return plan.updatedLinks
  }

  /** Writes an empty note unless the file exists: never overwrites (principle II). */
  const ensureNote = async (path: VaultPath) => {
    const { vault } = get()
    if (!vault) throw new Error("No open vault")
    const existed = await guard(() => vault.storage.exists(path))
    if (!existed) await guard(() => vault.storage.writeText(path, ""))
    if (get().vault !== vault) return !existed
    const text = existed ? await guard(() => vault.storage.readText(path)) : ""
    ;(await indexReady)?.update(path, text)
    set({ entries: withEntry(get().entries, entryFor(path)) })
    return !existed
  }

  const close = async () => {
    clearTimeout(refreshTimer)
    unsubscribeWatcher?.()
    unsubscribeWatcher = null
    await writeDeleted()
    const { vault } = get()
    set({ vault: null, entries: [], linkIndex: null, deleted: [] })
    await vault?.close()
  }

  const openRoot = async (root: string, fallback: VaultRef | null) => {
    if (!session) return
    const ticket = ++openTicket
    await close()
    if (ticket !== openTicket) return
    set({ status: "loading", ref: fallback })
    let vault: OpenVault
    try {
      vault = await session.open(root)
    } catch {
      if (ticket !== openTicket) return
      set({ status: "open-failed" })
      toast.error("Não foi possível abrir o vault.")
      return
    }
    try {
      const entries = await vault.storage.list()
      const stored = await vault.appData.read(deletedFile).catch(() => null)
      /* A newer open started meanwhile (StrictMode, a quick re-pick): this one must not stay watching. */
      if (ticket !== openTicket) {
        await vault.close()
        return
      }
      unsubscribeWatcher = vault.watcher.subscribe((changes) => {
        if (get().vault === vault) void onExternal(changes)
      })
      vault.onBeforeClose(writeDeleted)
      set({
        status: "ready",
        ref: vault.ref,
        vault,
        entries,
        deleted: withoutExisting(parseDeletedNotes(stored), entries),
      })
      buildIndex(vault, entries)
    } catch {
      set({ status: "open-failed" })
      toast.error("Não foi possível abrir o vault.")
    }
  }

  return {
    status: "loading",
    ref: null,
    entries: [],
    vault: null,
    linkIndex: null,
    deleted: [],

    async restore(provided) {
      await close()
      set({ status: "loading", ref: null })
      try {
        session = provided ?? (await getVaultSession())
      } catch {
        set({ status: "no-desktop" })
        return
      }
      const last = await session.lastOpened().catch(() => null)
      if (!last) {
        set({ status: "idle" })
        return
      }
      await openRoot(last.root, last)
    },

    async pick() {
      if (!session) return
      const previous = get().status
      set({ status: "picking" })
      const root = await session.pickFolder().catch(() => null)
      if (root === null) {
        set({ status: previous })
        return
      }
      await openRoot(root, null)
    },

    async refresh() {
      const { vault } = get()
      if (!vault) return
      const entries = await guard(() => vault.storage.list())
      if (get().vault === vault) set({ entries })
    },

    async createNote(folder) {
      const { vault, entries } = get()
      if (!vault) throw new Error("No open vault")
      const path = await guard(() => createNote(vault.storage, entries, folder))
      if (get().vault !== vault) return path
      set({ entries: withEntry(get().entries, entryFor(path)) })
      ;(await indexReady)?.update(path, "")
      return path
    },

    async createFolder(parent, name) {
      const { vault, entries } = get()
      if (!vault) throw new Error("No open vault")
      const path = await guard(() =>
        createFolder(vault.storage, entries, parent, name)
      )
      if (get().vault === vault)
        set({ entries: withEntry(get().entries, entryFor(path, "folder")) })
      return path
    },

    async renameEntry(path, newName) {
      const entry = get().entries.find((item) => item.path === path)
      if (!entry) return
      const extension = entry.kind === "note" ? ".md" : ""
      const validation = validateName(newName, extension)
      if (!validation.ok)
        throw new VaultActionError(messages.invalidName(validation.reason))
      const target = joinVaultPath(parentOf(path), newName + extension)
      if (target === path) return
      const taken = siblingNamed(
        get().entries,
        parentOf(path),
        newName + extension,
        path
      )
      if (taken)
        throw new VaultActionError(conflictMessage(get().entries, taken.path))
      const links = await runMoves([{ from: path, to: target }])
      toast.success(messages.renamed(entry.name, newName, links))
    },

    async moveEntry(path, targetFolder) {
      const entry = get().entries.find((item) => item.path === path)
      if (!entry || parentOf(path) === targetFolder) return
      if (entry.kind === "folder" && isInside(targetFolder, path))
        throw new VaultActionError(messages.moveIntoItself)
      const target = joinVaultPath(
        targetFolder,
        path.slice(path.lastIndexOf("/") + 1)
      )
      const links = await runMoves([{ from: path, to: target }])
      toast.success(messages.moved(entry.name, targetFolder, links))
    },

    async deleteEntry(path) {
      const { vault, entries } = get()
      if (!vault) return false
      const inside = entries
        .filter(
          (entry) => entry.kind !== "folder" && isInside(entry.path, path)
        )
        .map((entry) => entry.path)
      await runBeforeMutate(inside)
      try {
        await guard(() => vault.trash.moveToTrash(path))
      } catch (error) {
        if (isVaultError(error, "trash-unavailable")) {
          toast.error(messages.trashUnavailable)
          return false
        }
        toast.error("Não foi possível excluir.")
        return false
      }
      if (get().vault !== vault) return true
      /* The index first: the editor re-reads link states when entries change. */
      const index = await indexReady
      for (const file of inside) index?.remove(file)
      set({ entries: withoutTree(get().entries, path) })
      setDeleted(
        withDeleted(
          get().deleted,
          inside.filter((file) => kindOf(file) === "note"),
          new Date()
        )
      )
      for (const file of inside)
        if (kindOf(file) === "note")
          emitEntryEvent({ kind: "removed", path: file })
      return true
    },

    noteSaved(path, content) {
      get().linkIndex?.update(path, content)
      set({ entries: withTouched(get().entries, [path]) })
    },

    async followLink(link, from) {
      const index = await indexReady
      if (!index)
        throw new VaultActionError("O índice de links ainda não está pronto.")
      const target = resolveLinkTarget({
        link,
        from,
        index,
        entries: get().entries,
        deleted: get().deleted,
      })
      switch (target.state) {
        case "valid":
          return target.heading
            ? { type: "open", path: target.path, heading: target.heading }
            : { type: "open", path: target.path }
        case "broken":
          return { type: "broken", path: target.path }
        case "file":
          return { type: "unsupported", kind: target.kind }
        case "pending": {
          /* FR-009: every segment follows the naming rules of spec 001. */
          const segments = target.path.slice(0, -".md".length).split("/")
          for (const [position, segment] of segments.entries()) {
            const last = position === segments.length - 1
            const validation = validateName(segment, last ? ".md" : "")
            if (!validation.ok)
              return { type: "invalid", reason: validation.reason }
          }
          const created = await ensureNote(target.path)
          return created
            ? { type: "open", path: target.path, created }
            : { type: "open", path: target.path }
        }
        case "ambiguous": {
          /* FR-010: nothing opens nor is created until the user picks one. */
          const name = link.target.slice(link.target.lastIndexOf("/") + 1)
          return target.heading
            ? {
                type: "choose",
                name,
                candidates: target.candidates,
                heading: target.heading,
              }
            : { type: "choose", name, candidates: target.candidates }
        }
      }
    },

    async recreateNote(path) {
      await ensureNote(path)
      return { type: "open", path }
    },
  }
})

/* A note that exists again leaves the registry, whoever brought it back. */
useVaultStore.subscribe((state, previous) => {
  if (state.entries !== previous.entries)
    setDeleted(withoutExisting(state.deleted, state.entries))
})
