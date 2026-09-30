import type { VaultPath } from "@/shared/vault"

export interface LinkOccurrence {
  source: VaultPath
  /** Exact position of `[[...]]` or `![[...]]` in the text. */
  range: { start: number; end: number }
  /** Part before `#` and `|`, without `.md` (`api`, `backend/api`). */
  target: string
  /** `#Heading` or `#^block`, or "". */
  subpath: string
  /** Part after `|`, or "". */
  alias: string
  embed: boolean
}

const linkPattern = /(!?)\[\[([^[\]\n|#]*)(#[^[\]\n|]*)?(?:\|([^[\]\n]*))?\]\]/g
const fencePattern = /^ {0,3}(`{3,}|~{3,})/

/** Ranges of fenced blocks and inline code spans, where links do not count. */
export function codeRanges(text: string) {
  const ranges: { start: number; end: number }[] = []
  let offset = 0
  let fence: { marker: string; start: number } | null = null
  for (const line of text.split("\n")) {
    const lineEnd = offset + line.length
    const opener = line.match(fencePattern)?.[1]
    if (fence) {
      if (
        opener?.[0] === fence.marker[0] &&
        opener.length >= fence.marker.length
      ) {
        ranges.push({ start: fence.start, end: lineEnd })
        fence = null
      }
    } else if (opener) {
      fence = { marker: opener, start: offset }
    } else {
      for (const span of line.matchAll(/(`+)[^`]*?\1/g))
        ranges.push({
          start: offset + span.index,
          end: offset + span.index + span[0].length,
        })
    }
    offset = lineEnd + 1
  }
  if (fence) ranges.push({ start: fence.start, end: text.length })
  return ranges
}

export function parseLinks(source: VaultPath, text: string): LinkOccurrence[] {
  const code = codeRanges(text)
  const links: LinkOccurrence[] = []
  for (const match of text.matchAll(linkPattern)) {
    const start = match.index
    if (code.some((range) => start >= range.start && start < range.end))
      continue
    const target = match[2].trim().replace(/\.md$/i, "")
    if (target === "") continue
    links.push({
      source,
      range: { start, end: start + match[0].length },
      target,
      subpath: match[3] ?? "",
      alias: match[4] ?? "",
      embed: match[1] === "!",
    })
  }
  return links
}
