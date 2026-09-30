import { basenameOf, kindOf, nameKey, type VaultPath } from "@/shared/vault"
import { canvasSchema } from "../types/links.schemas"
import { type LinkOccurrence, parseLinks } from "./links.parser"

export type LinkResolution =
  | { status: "resolved"; path: VaultPath }
  | { status: "ambiguous"; candidates: VaultPath[] }
  | { status: "broken" }

const withoutExtension = (path: VaultPath) => path.replace(/\.md$/i, "")

/** `file` of every `type: "file"` node, or `null` when the JSON is invalid. */
export function canvasFileRefs(json: string): VaultPath[] | null {
  try {
    const parsed = canvasSchema.safeParse(JSON.parse(json))
    if (!parsed.success) return null
    return parsed.data.nodes.flatMap((node) =>
      node.type === "file" && node.file ? [node.file] : []
    )
  } catch {
    return null
  }
}

/** Derived from the files and rebuilt on open (principle II); keys are note and canvas paths. */
export function createLinkIndex(files: Record<VaultPath, string>) {
  const notes = new Set<VaultPath>()
  const occurrences = new Map<VaultPath, LinkOccurrence[]>()
  const canvasRefs = new Map<VaultPath, VaultPath[]>()
  const texts = new Map<VaultPath, string>()

  const byName = () => {
    const map = new Map<string, VaultPath[]>()
    for (const path of notes) {
      const key = nameKey(basenameOf(path))
      map.set(key, [...(map.get(key) ?? []), path])
    }
    return map
  }
  let nameCache: Map<string, VaultPath[]> | null = null
  const notesByName = () => {
    nameCache ??= byName()
    return nameCache
  }
  const pathByKey = new Map<string, VaultPath>()

  const addNote = (path: VaultPath) => {
    if (notes.has(path)) return
    notes.add(path)
    pathByKey.set(nameKey(withoutExtension(path)), path)
    nameCache = null
  }
  const dropNote = (path: VaultPath) => {
    if (!notes.delete(path)) return
    pathByKey.delete(nameKey(withoutExtension(path)))
    nameCache = null
  }

  const index = {
    resolve(link: Pick<LinkOccurrence, "target">): LinkResolution {
      if (link.target.includes("/")) {
        const path = pathByKey.get(nameKey(link.target))
        return path ? { status: "resolved", path } : { status: "broken" }
      }
      const candidates = [...(notesByName().get(nameKey(link.target)) ?? [])]
      if (candidates.length === 1)
        return { status: "resolved", path: candidates[0] }
      if (candidates.length > 1)
        return { status: "ambiguous", candidates: candidates.sort() }
      return { status: "broken" }
    },
    linksTo(path: VaultPath): LinkOccurrence[] {
      return [...occurrences.values()].flatMap((links) =>
        links.filter((link) => {
          const resolution = index.resolve(link)
          return resolution.status === "resolved" && resolution.path === path
        })
      )
    },
    canvasRefsTo(path: VaultPath): VaultPath[] {
      return [...canvasRefs]
        .filter(([, refs]) => refs.includes(path))
        .map(([canvas]) => canvas)
        .sort()
    },
    notePaths(): VaultPath[] {
      return [...notes]
    },
    /** Raw text of the last update, so mentions need no disk read (spec 003, research R2). */
    textOf(path: VaultPath): string | undefined {
      return texts.get(path)
    },
    /** Adds or refreshes a note or canvas after it was read or written. */
    update(path: VaultPath, text: string) {
      const kind = kindOf(path)
      if (kind === "note") {
        addNote(path)
        occurrences.set(path, parseLinks(path, text))
        texts.set(path, text)
      } else if (kind === "canvas") {
        canvasRefs.set(path, canvasFileRefs(text) ?? [])
        texts.set(path, text)
      }
    },
    remove(path: VaultPath) {
      dropNote(path)
      occurrences.delete(path)
      canvasRefs.delete(path)
      texts.delete(path)
    },
    /** Moves a note or canvas without re-reading it. */
    rename(from: VaultPath, to: VaultPath) {
      if (notes.has(from)) {
        dropNote(from)
        addNote(to)
      }
      const links = occurrences.get(from)
      if (links) {
        occurrences.delete(from)
        occurrences.set(
          to,
          links.map((link) => ({ ...link, source: to }))
        )
      }
      const refs = canvasRefs.get(from)
      if (refs) {
        canvasRefs.delete(from)
        canvasRefs.set(to, refs)
      }
      const text = texts.get(from)
      if (text !== undefined) {
        texts.delete(from)
        texts.set(to, text)
      }
    },
  }

  for (const [path, text] of Object.entries(files)) index.update(path, text)
  return index
}

export type LinkIndex = ReturnType<typeof createLinkIndex>
