import { parse } from "yaml"
import { codeRanges, foldText, parseLinks } from "@/features/links"

/** Tags and properties read from a note, only for searching (data-model "Metadados de uma nota"). */
export interface NoteMetadata {
  /** As written, without `#` nor a trailing `/`. */
  tags: string[]
  /** Property name → values as text; lists give several values. */
  properties: Map<string, string[]>
}

export interface SearchMetadata {
  tags: string[]
  propertyKeys: string[]
  propertyValues: Map<string, string[]>
}

const tagPattern = /(?<=^|\s)#([\p{L}\p{N}_/-]+)/gu
const hasLetter = /\p{L}/u
const frontmatterPattern =
  /^﻿?---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/

/** The block at the very top, if any, and where the body starts. */
function frontmatterOf(text: string) {
  const match = text.match(frontmatterPattern)
  return match ? { yaml: match[1], end: match[0].length } : null
}

function textValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(textValues)
  if (value === null || value === undefined || typeof value === "object")
    return []
  return [String(value)]
}

/** Research R5: read only; a malformed block gives no properties and stays searchable as text. */
function readProperties(yaml: string) {
  const properties = new Map<string, string[]>()
  let data: unknown
  try {
    data = parse(yaml)
  } catch {
    return properties
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    return properties
  for (const [key, value] of Object.entries(data)) {
    const values = textValues(value)
    if (values.length) properties.set(key, values)
  }
  return properties
}

const cleanTag = (tag: string) =>
  tag.trim().replace(/^#/, "").replace(/\/+$/, "")

/** Research R4: `#` at a line start or after a space, with a letter, outside code and links. */
function inlineTags(text: string, from: number) {
  const blocked = [
    ...codeRanges(text),
    ...parseLinks("", text).map((link) => link.range),
  ]
  const tags: string[] = []
  for (const match of text.matchAll(tagPattern)) {
    const start = match.index
    if (start < from || !hasLetter.test(match[1])) continue
    if (blocked.some((range) => start >= range.start && start < range.end))
      continue
    tags.push(cleanTag(match[1]))
  }
  return tags
}

export function readMetadata(text: string): NoteMetadata {
  const frontmatter = frontmatterOf(text)
  const properties = frontmatter
    ? readProperties(frontmatter.yaml)
    : new Map<string, string[]>()
  const fromProperty = (properties.get("tags") ?? []).flatMap((value) =>
    value.split(/[,\s]+/)
  )
  const seen = new Set<string>()
  const tags: string[] = []
  for (const tag of [
    ...fromProperty.map(cleanTag),
    ...inlineTags(text, frontmatter?.end ?? 0),
  ]) {
    const key = foldText(tag)
    if (!tag || seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }
  return { tags, properties }
}

/** What exists in the vault, for the filters and the suggestions (distinct, in order). */
export function mergeMetadata(notes: NoteMetadata[]): SearchMetadata {
  const distinct = (values: Iterable<string>) => {
    const byKey = new Map<string, string>()
    for (const value of values)
      if (!byKey.has(foldText(value))) byKey.set(foldText(value), value)
    return [...byKey.values()].sort((a, b) =>
      foldText(a).localeCompare(foldText(b))
    )
  }
  const values = new Map<string, string[]>()
  for (const note of notes)
    for (const [key, list] of note.properties)
      values.set(key, [...(values.get(key) ?? []), ...list])
  return {
    tags: distinct(notes.flatMap((note) => note.tags)),
    propertyKeys: distinct(values.keys()),
    propertyValues: new Map(
      [...values].map(([key, list]) => [key, distinct(list)])
    ),
  }
}
