import {
  basenameOf,
  joinVaultPath,
  nameKey,
  parentOf,
  type VaultEntry,
  type VaultPath,
} from "@/shared/vault"
import type { DeletedNotes } from "./links.deleted"
import type { LinkIndex } from "./links.index"
import type { LinkOccurrence } from "./links.parser"

export type LinkState = "valid" | "pending" | "broken" | "ambiguous" | "file"

/** Destination of a link with its state (data-model "LinkTarget"). */
export type LinkTarget =
  | { state: "valid"; path: VaultPath; heading?: string }
  | { state: "ambiguous"; candidates: VaultPath[]; heading?: string }
  | { state: "file"; path: VaultPath; kind: "canvas" | "other" }
  | { state: "broken"; path: VaultPath }
  /** `path` is where following the link creates the note (FR-007). */
  | { state: "pending"; path: VaultPath }

/** `#Heading` becomes "Heading"; `#^block` opens the whole note. */
function headingOf(subpath: string) {
  if (!subpath.startsWith("#") || subpath.startsWith("#^")) return undefined
  return subpath.slice(1).trim() || undefined
}

/** Name validation of the pending path is left to the vault, which creates the note. */
export function resolveLinkTarget({
  link,
  from,
  index,
  entries,
  deleted,
}: {
  link: Pick<LinkOccurrence, "target" | "subpath">
  from: VaultPath
  index: LinkIndex
  entries: VaultEntry[]
  deleted: DeletedNotes
}): LinkTarget {
  const resolution = index.resolve(link)
  const heading = headingOf(link.subpath)
  if (resolution.status === "resolved")
    return heading
      ? { state: "valid", path: resolution.path, heading }
      : { state: "valid", path: resolution.path }
  if (resolution.status === "ambiguous")
    return heading
      ? { state: "ambiguous", candidates: resolution.candidates, heading }
      : { state: "ambiguous", candidates: resolution.candidates }

  const withFolder = link.target.includes("/")
  const key = nameKey(link.target)
  const file = entries.find(
    (entry) =>
      (entry.kind === "canvas" || entry.kind === "other") &&
      nameKey(withFolder ? entry.path : entry.name) === key
  )
  if (file)
    return {
      state: "file",
      path: file.path,
      kind: file.kind === "canvas" ? "canvas" : "other",
    }

  /* The registry is oldest first, so the last match is the latest deletion. */
  const removed = deleted
    .filter((note) =>
      withFolder
        ? nameKey(note.path) === nameKey(`${link.target}.md`)
        : nameKey(basenameOf(note.path)) === key
    )
    .at(-1)
  if (removed) return { state: "broken", path: removed.path }

  return {
    state: "pending",
    path: withFolder
      ? `${link.target}.md`
      : joinVaultPath(parentOf(from), `${link.target}.md`),
  }
}
