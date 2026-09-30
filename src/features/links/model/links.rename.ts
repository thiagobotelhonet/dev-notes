import { sha256Hex } from "@/shared/lib/hash"
import {
  basenameOf,
  isInside,
  kindOf,
  nameKey,
  parentOf,
  type VaultEntry,
  type VaultPath,
} from "@/shared/vault"
import { rewriteCanvasFileRefs } from "./links.canvas"
import type { LinkIndex } from "./links.index"
import { type LinkOccurrence, parseLinks } from "./links.parser"

export interface EntryMove {
  from: VaultPath
  to: VaultPath
}

export interface ChangePlan {
  /** Entry-level moves, applied first and in order. */
  moves: EntryMove[]
  /** Notes and canvases to rewrite, by their path after the moves. */
  edits: { path: VaultPath; before: string; after: string }[]
  /** Destinations already taken; if any, nothing is written. */
  conflicts: { path: VaultPath; existing: VaultPath }[]
  /** Files that could not be planned (invalid canvas JSON). */
  skipped: VaultPath[]
  /** Links and canvas cards rewritten. */
  updatedLinks: number
}

const fileName = (path: VaultPath) => path.slice(path.lastIndexOf("/") + 1)
const withoutExtension = (path: VaultPath) => path.replace(/\.md$/i, "")

/** Every file (not folder) moved, with its new path. */
export function fileMoves(entries: VaultEntry[], moves: EntryMove[]) {
  const kinds = new Map(entries.map((entry) => [entry.path, entry.kind]))
  const result = new Map<VaultPath, VaultPath>()
  for (const move of moves) {
    if (kinds.get(move.from) === "folder") {
      for (const entry of entries)
        if (entry.kind !== "folder" && isInside(entry.path, move.from))
          result.set(entry.path, move.to + entry.path.slice(move.from.length))
    } else {
      result.set(move.from, move.to)
    }
  }
  return result
}

function nameCounts(paths: Iterable<VaultPath>) {
  const counts = new Map<string, number>()
  for (const path of paths) {
    const key = nameKey(basenameOf(path))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

function context(index: LinkIndex, entries: VaultEntry[], moves: EntryMove[]) {
  const moved = fileMoves(entries, moves)
  const movedNotes = new Map(
    [...moved].filter(([from]) => kindOf(from) === "note")
  )
  const notesBefore = index.notePaths()
  const notesAfter = notesBefore.map((path) => movedNotes.get(path) ?? path)
  const countsAfter = nameCounts(notesAfter)
  /* Notes that stay put but whose name becomes repeated (RN-LINK-006). */
  const newlyRepeated = notesBefore.filter(
    (path) =>
      !movedNotes.has(path) &&
      (countsAfter.get(nameKey(basenameOf(path))) ?? 0) > 1 &&
      index.resolve({ target: basenameOf(path) }).status === "resolved"
  )
  return { moved, movedNotes, countsAfter, newlyRepeated }
}

/** Files the operation rewrites; the editor saves them before the plan is made. */
export function affectedByMoves(
  index: LinkIndex,
  entries: VaultEntry[],
  moves: EntryMove[]
): VaultPath[] {
  const { moved, movedNotes, newlyRepeated } = context(index, entries, moves)
  const affected = new Set<VaultPath>(moved.keys())
  for (const note of [...movedNotes.keys(), ...newlyRepeated])
    for (const link of index.linksTo(note)) affected.add(link.source)
  for (const file of moved.keys())
    for (const canvas of index.canvasRefsTo(file)) affected.add(canvas)
  return [...affected].sort()
}

function linkText(link: LinkOccurrence, target: string) {
  const alias = link.alias ? `|${link.alias}` : ""
  return `${link.embed ? "!" : ""}[[${target}${link.subpath}${alias}]]`
}

/** Every change of a rename or move, before any write (FR-019); `contents` is fresh text. */
export async function planChange(
  index: LinkIndex,
  entries: VaultEntry[],
  contents: Record<VaultPath, string>,
  moves: EntryMove[]
): Promise<ChangePlan> {
  const conflicts: ChangePlan["conflicts"] = []
  for (const move of moves) {
    const key = nameKey(fileName(move.to))
    const existing = entries.find(
      (entry) =>
        entry.path !== move.from &&
        !moves.some((other) => isInside(entry.path, other.from)) &&
        parentOf(entry.path) === parentOf(move.to) &&
        nameKey(fileName(entry.path)) === key
    )
    if (existing) conflicts.push({ path: move.to, existing: existing.path })
  }
  const plan: ChangePlan = {
    moves,
    edits: [],
    conflicts,
    skipped: [],
    updatedLinks: 0,
  }
  if (conflicts.length) return plan

  const { moved, movedNotes, countsAfter, newlyRepeated } = context(
    index,
    entries,
    moves
  )
  const repeated = new Set(newlyRepeated)
  const afterPath = (path: VaultPath) => moved.get(path) ?? path

  const newTarget = (link: LinkOccurrence): string | null => {
    const resolution = index.resolve(link)
    if (resolution.status !== "resolved") return null
    const target = resolution.path
    const destination = movedNotes.get(target)
    if (destination) {
      const unique = countsAfter.get(nameKey(basenameOf(destination))) === 1
      const text = unique
        ? basenameOf(destination)
        : withoutExtension(destination)
      return nameKey(text) === nameKey(link.target) ? null : text
    }
    if (repeated.has(target) && !link.target.includes("/"))
      return withoutExtension(target)
    return null
  }

  const renames = new Map(moved)
  for (const [path, content] of Object.entries(contents)) {
    let after = content
    let count = 0
    if (kindOf(path) === "note") {
      const links = parseLinks(path, content).reverse()
      for (const link of links) {
        const target = newTarget(link)
        if (target === null) continue
        after =
          after.slice(0, link.range.start) +
          linkText(link, target) +
          after.slice(link.range.end)
        count++
      }
    } else if (kindOf(path) === "canvas") {
      const rewrite = rewriteCanvasFileRefs(content, renames)
      if ("error" in rewrite) {
        plan.skipped.push(afterPath(path))
        continue
      }
      after = rewrite.json
      if (rewrite.changed)
        count = [...renames.keys()].filter((file) =>
          content.includes(JSON.stringify(file))
        ).length
    }
    if (after === content) continue
    plan.edits.push({
      path: afterPath(path),
      before: await sha256Hex(content),
      after,
    })
    plan.updatedLinks += count
  }
  plan.edits.sort((a, b) => a.path.localeCompare(b.path))
  return plan
}
