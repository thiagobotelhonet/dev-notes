import { toast } from "sonner"
import { create } from "zustand"
import { appConfig } from "@/config/app"
import {
  onBeforeMutate,
  onEntryEvent,
  useVaultStore,
  type VaultEvent,
} from "@/features/vault"
import { sha256Hex } from "@/shared/lib/hash"
import { isVaultError, type OpenVault, type VaultPath } from "@/shared/vault"
import { decodeNote, encodeNote, type LineEnding } from "./model/note.content"
import {
  type NoteEvent,
  type NoteStatus,
  transition,
} from "./model/note.machine"

interface NoteState {
  path: VaultPath | null
  buffer: string
  /** Hash of the last content the app read or wrote. */
  diskHash: string | null
  lineEnding: LineEnding
  bom: boolean
  status: NoteStatus
  hadPending: boolean
  /** Raw file content while in `conflict`. */
  externalRaw: string | null
  /** Bumps when the buffer is replaced from disk, never on user edits. */
  revision: number
  /** Heading to place the cursor on once the note is shown (research R8). */
  headingRequest: { title: string } | null
  open(path: VaultPath, options?: { heading?: string }): Promise<void>
  edit(text: string): void
  flush(): Promise<void>
  close(): void
  keepMine(): Promise<void>
  keepExternal(): Promise<void>
  recreate(): Promise<void>
  /** Reacts to a change of the open file, by the app or outside it. */
  fileChanged(path: VaultPath, fromApp: boolean): Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | undefined
let inFlight: Promise<void> | null = null
let closeHookVault: OpenVault | null = null
let removeCloseHook: (() => void) | null = null

const emptyNote = {
  path: null,
  buffer: "",
  diskHash: null,
  lineEnding: "\n" as LineEnding,
  bom: false,
  status: "clean" as NoteStatus,
  hadPending: false,
  externalRaw: null,
}

function currentVault(): OpenVault {
  const { vault } = useVaultStore.getState()
  if (!vault) throw new Error("No open vault")
  return vault
}

async function readRaw(path: VaultPath): Promise<string | null> {
  try {
    return await currentVault().storage.readText(path)
  } catch (error) {
    if (isVaultError(error, "not-found")) return null
    throw error
  }
}

export const useNoteStore = create<NoteState>()((set, get) => {
  const apply = (event: NoteEvent) => {
    const { status, hadPending } = get()
    const next = transition({ status, hadPending }, event)
    set({ status: next.status, hadPending: next.hadPending })
    return next
  }

  /** Replaces the buffer with the file content the app just read. */
  const load = async (raw: string) => {
    const decoded = decodeNote(raw)
    set({
      buffer: decoded.text,
      lineEnding: decoded.lineEnding,
      bom: decoded.bom,
      diskHash: await sha256Hex(raw),
      externalRaw: null,
      revision: get().revision + 1,
    })
  }

  const write = async (path: VaultPath) => {
    const { buffer, lineEnding, bom } = get()
    const content = encodeNote(buffer, lineEnding, bom)
    await currentVault().storage.writeText(path, content)
    set({ diskHash: await sha256Hex(content) })
    useVaultStore.getState().noteSaved(path, content)
    apply({ type: "saveDone" })
    if (get().status === "dirty") schedule()
  }

  const schedule = () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void get().flush()
    }, appConfig.autosaveDelayMs)
  }

  const saveFailed = () => {
    set({ status: "dirty" })
    toast.error("Não foi possível gravar a nota. A edição continua aberta.")
  }

  /** Re-reads the file before saving and never overwrites content the app has not seen. */
  const save = async () => {
    const { path, diskHash } = get()
    if (!path || get().status !== "dirty") return
    clearTimeout(saveTimer)
    apply({ type: "saveStarted" })
    try {
      const raw = await readRaw(path)
      if (get().path !== path) return
      if (raw === null) {
        apply({ type: "externalRemoved" })
        return
      }
      if ((await sha256Hex(raw)) !== diskHash) {
        apply({ type: "external" })
        set({ externalRaw: raw })
        return
      }
      await write(path)
    } catch {
      if (get().path === path) saveFailed()
    }
  }

  const registerCloseHook = () => {
    const vault = useVaultStore.getState().vault
    if (!vault || vault === closeHookVault) return
    removeCloseHook?.()
    closeHookVault = vault
    removeCloseHook = vault.onBeforeClose(() => get().flush())
  }

  /** The file changed: reload, or keep both versions in a conflict. */
  const reactToFileChange = async (path: VaultPath, fromApp: boolean) => {
    const raw = await readRaw(path).catch(() => null)
    if (get().path !== path) return
    if (raw === null) {
      apply({ type: "externalRemoved" })
      return
    }
    const hash = await sha256Hex(raw)
    if (hash === get().diskHash && get().status !== "missing") return
    const next = apply({ type: "external" })
    if (next.reload) {
      await load(raw)
    } else if (next.status === "conflict") {
      if (fromApp) set({ diskHash: hash })
      set({ externalRaw: raw })
    }
  }

  return {
    ...emptyNote,
    revision: 0,
    headingRequest: null,

    async open(path, options) {
      const headingRequest = options?.heading
        ? { title: options.heading }
        : null
      if (get().path === path) {
        if (headingRequest) set({ headingRequest })
        return
      }
      await get().flush()
      clearTimeout(saveTimer)
      registerCloseHook()
      const raw = await currentVault().storage.readText(path)
      set({ ...emptyNote, path, headingRequest: null })
      await load(raw)
      set({ headingRequest })
    },

    edit(text) {
      if (text === get().buffer) return
      set({ buffer: text })
      const { status } = get()
      if (status === "conflict" || status === "missing") return
      apply({ type: "edit" })
      schedule()
    },

    async flush() {
      while (inFlight) await inFlight
      if (get().status !== "dirty") return
      inFlight = save().finally(() => {
        inFlight = null
      })
      await inFlight
    },

    close() {
      clearTimeout(saveTimer)
      set({ ...emptyNote, headingRequest: null })
    },

    async keepMine() {
      const { path, externalRaw } = get()
      if (!path || get().status !== "conflict") return
      if (externalRaw !== null) set({ diskHash: await sha256Hex(externalRaw) })
      apply({ type: "keepMine" })
      await write(path).catch(saveFailed)
    },

    async keepExternal() {
      const { path, externalRaw } = get()
      if (!path || get().status !== "conflict") return
      apply({ type: "keepExternal" })
      const raw = externalRaw ?? (await readRaw(path)) ?? ""
      await load(raw)
    },

    async recreate() {
      const { path } = get()
      if (!path || get().status !== "missing") return
      apply({ type: "recreate" })
      await write(path).catch(saveFailed)
      await useVaultStore.getState().refresh()
    },

    fileChanged: reactToFileChange,
  }
})

const fileEvents = new Map<VaultPath, Promise<void>>()

/** Events of one file are handled in order, after any save in flight. */
function fileChanged(path: VaultPath, fromApp: boolean) {
  const task = async () => {
    while (inFlight) await inFlight
    await useNoteStore.getState().fileChanged(path, fromApp)
  }
  const next = (fileEvents.get(path) ?? Promise.resolve()).then(task, task)
  fileEvents.set(path, next)
}

function handleVaultEvent(event: VaultEvent) {
  const note = useNoteStore.getState()
  if (!note.path) return
  if (event.kind === "moved" && event.from === note.path) {
    useNoteStore.setState({ path: event.to })
  } else if (event.kind === "removed" && event.path === note.path) {
    note.close()
  } else if (event.kind === "rewritten" && event.path === note.path) {
    fileChanged(note.path, true)
  } else if (
    event.kind === "external" &&
    (event.change.path === note.path ||
      (event.change.kind === "removed" &&
        note.path.startsWith(`${event.change.path}/`)))
  ) {
    fileChanged(note.path, false)
  }
}

/* Registered once: the editor depends on the vault, never the other way. */
onBeforeMutate(async (paths) => {
  const { path } = useNoteStore.getState()
  if (path && paths.includes(path)) await useNoteStore.getState().flush()
})
onEntryEvent(handleVaultEvent)
if (typeof window !== "undefined")
  window.addEventListener("blur", () => {
    void useNoteStore.getState().flush()
  })
