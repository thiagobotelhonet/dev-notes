import type { ChangePlan } from "@/features/links"
import { sha256Hex } from "@/shared/lib/hash"
import {
  basenameOf,
  type EntryKind,
  isInside,
  isVaultError,
  joinVaultPath,
  kindOf,
  nameKey,
  parentOf,
  type VaultEntry,
  type VaultPath,
  type VaultStorage,
} from "@/shared/vault"
import { nextUntitledName, validateName } from "./vault.names"

/** An error whose message is already the Portuguese text for the user. */
export class VaultActionError extends Error {
  override name = "VaultActionError"
}

const folderLabel = (folder: VaultPath) => (folder === "" ? "a raiz" : folder)

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

export const messages = {
  noteExists: (name: string, folder: VaultPath) =>
    `Já existe uma nota chamada “${name}” em ${folderLabel(folder)}.`,
  folderExists: (name: string, folder: VaultPath) =>
    `Já existe uma pasta chamada “${name}” em ${folderLabel(folder)}.`,
  fileExists: (name: string, folder: VaultPath) =>
    `Já existe um arquivo chamado “${name}” em ${folderLabel(folder)}.`,
  invalidName: (reason: string) => `Nome inválido: ${reason}.`,
  moveIntoItself: "Uma pasta não pode ir para dentro dela mesma.",
  renamed: (from: string, to: string, links: number) =>
    `“${from}” agora é “${to}”. ${plural(links, "link atualizado", "links atualizados")}.`,
  moved: (name: string, folder: VaultPath, links: number) =>
    `“${name}” foi movida para ${folderLabel(folder)}. ${plural(links, "link atualizado", "links atualizados")}.`,
  partial: (files: VaultPath[]) =>
    `${plural(files.length, "arquivo não foi atualizado", "arquivos não foram atualizados")}: ${files.join(", ")}.`,
  trashUnavailable:
    "A lixeira do sistema não está disponível. Nada foi excluído; você pode excluir pelo gerenciador de arquivos.",
}

/** The message for a destination that is already taken. */
export function conflictMessage(entries: VaultEntry[], existing: VaultPath) {
  const entry = entries.find((item) => item.path === existing)
  const folder = parentOf(existing)
  if (entry?.kind === "folder")
    return messages.folderExists(entryName(existing), folder)
  if (entry?.kind === "note") return messages.noteExists(entry.name, folder)
  return messages.fileExists(entryName(existing), folder)
}

const entryName = (path: VaultPath) => path.slice(path.lastIndexOf("/") + 1)

/** The sibling in `folder` whose file name has the same nameKey, if any. */
export function siblingNamed(
  entries: VaultEntry[],
  folder: VaultPath,
  fileName: string,
  except?: VaultPath
) {
  const key = nameKey(fileName)
  return entries.find(
    (entry) =>
      entry.path !== except &&
      parentOf(entry.path) === folder &&
      nameKey(entryName(entry.path)) === key
  )
}

/** Folders get `modifiedAt: 0`; a file the app just wrote gets the current time. */
export function entryFor(
  path: VaultPath,
  kind?: EntryKind,
  modifiedAt?: number
): VaultEntry {
  const resolved = kind ?? kindOf(path)
  return {
    path,
    kind: resolved,
    name: resolved === "folder" ? entryName(path) : basenameOf(path),
    modifiedAt: resolved === "folder" ? 0 : (modifiedAt ?? Date.now()),
  }
}

const byPath = (a: VaultEntry, b: VaultEntry) => a.path.localeCompare(b.path)

/** Adds an entry and any missing parent folder. */
export function withEntry(entries: VaultEntry[], entry: VaultEntry) {
  const known = new Set(entries.map((item) => item.path))
  const added: VaultEntry[] = []
  for (
    let folder = parentOf(entry.path);
    folder !== "";
    folder = parentOf(folder)
  )
    if (!known.has(folder)) added.push(entryFor(folder, "folder"))
  if (!known.has(entry.path)) added.push(entry)
  return [...entries, ...added].sort(byPath)
}

/** The app just wrote these files: their modification time is now. */
export function withTouched(entries: VaultEntry[], paths: VaultPath[]) {
  const written = new Set(paths)
  const now = Date.now()
  return entries.map((entry) =>
    written.has(entry.path) ? { ...entry, modifiedAt: now } : entry
  )
}

export function withoutTree(entries: VaultEntry[], path: VaultPath) {
  return entries.filter((entry) => !isInside(entry.path, path))
}

export function withMovedTree(
  entries: VaultEntry[],
  from: VaultPath,
  to: VaultPath
) {
  return entries
    .map((entry) =>
      isInside(entry.path, from)
        ? entryFor(
            to + entry.path.slice(from.length),
            entry.kind,
            entry.modifiedAt
          )
        : entry
    )
    .sort(byPath)
}

/** Creates an empty note named "Sem título" (numbered if taken). */
export async function createNote(
  storage: VaultStorage,
  entries: VaultEntry[],
  folder: VaultPath
): Promise<VaultPath> {
  const taken = new Set(
    entries
      .filter(
        (entry) => entry.kind === "note" && parentOf(entry.path) === folder
      )
      .map((entry) => nameKey(entry.name))
  )
  const path = joinVaultPath(folder, `${nextUntitledName(taken)}.md`)
  await storage.writeText(path, "")
  return path
}

export async function createFolder(
  storage: VaultStorage,
  entries: VaultEntry[],
  parent: VaultPath,
  name: string
): Promise<VaultPath> {
  const validation = validateName(name)
  if (!validation.ok)
    throw new VaultActionError(messages.invalidName(validation.reason))
  if (siblingNamed(entries, parent, name))
    throw new VaultActionError(messages.folderExists(name, parent))
  const path = joinVaultPath(parent, name)
  await storage.createFolder(path)
  return path
}

export interface AppliedPlan {
  /** Files rewritten, by their path after the moves. */
  applied: VaultPath[]
  /** Files left without the update (FR-020). */
  failed: VaultPath[]
}

/** Moves, then edits; a file changed meanwhile is skipped and nothing is undone (FR-020). */
export async function applyChangePlan(
  storage: VaultStorage,
  plan: ChangePlan
): Promise<AppliedPlan> {
  if (plan.conflicts.length)
    throw new Error("A plan with conflicts is never applied")
  for (const move of plan.moves) await storage.move(move.from, move.to)
  const applied: VaultPath[] = []
  const failed: VaultPath[] = [...plan.skipped]
  /* One batch read right before writing, instead of one read per file (SC-002). */
  const current = new Map(
    (await storage.readMany(plan.edits.map((edit) => edit.path))).map(
      (file) => [file.path, file.content]
    )
  )
  const apply = async (edit: ChangePlan["edits"][number]) => {
    try {
      const content = current.get(edit.path)
      if (content === undefined || (await sha256Hex(content)) !== edit.before) {
        failed.push(edit.path)
        return
      }
      await storage.writeText(edit.path, edit.after)
      applied.push(edit.path)
    } catch (error) {
      if (isVaultError(error, "vault-unavailable")) throw error
      failed.push(edit.path)
    }
  }
  /* Each edit is a different file, so a few run at once (SC-002). */
  const pending = [...plan.edits]
  const worker = async () => {
    for (let edit = pending.shift(); edit; edit = pending.shift())
      await apply(edit)
  }
  await Promise.all(Array.from({ length: parallelWrites }, worker))
  applied.sort()
  failed.sort()
  return { applied, failed }
}

const parallelWrites = 8
