import { foldText } from "./links.text"

/** A Markdown ATX heading and the text under it (data-model "Section"). */
export interface Section {
  title: string
  level: number
  /** Start of the heading line. */
  from: number
  /** Before the next heading of the same or a higher level, or the end. */
  to: number
}

const headingPattern = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t#]*$/
const fencePattern = /^ {0,3}(`{3,}|~{3,})/

function headings(text: string) {
  const found: Omit<Section, "to">[] = []
  let offset = 0
  let fence: string | null = null
  for (const line of text.split("\n")) {
    const opener = line.match(fencePattern)?.[1]
    if (fence) {
      if (opener?.[0] === fence[0] && opener.length >= fence.length)
        fence = null
    } else if (opener) {
      fence = opener
    } else {
      const heading = line.match(headingPattern)
      if (heading)
        found.push({
          title: heading[2].trim(),
          level: heading[1].length,
          from: offset,
        })
    }
    offset += line.length + 1
  }
  return found
}

/** First heading whose title matches without case, accents or surrounding spaces (research R7). */
export function findSection(text: string, heading: string): Section | null {
  const all = headings(text)
  const wanted = foldText(heading)
  const index = all.findIndex((item) => foldText(item.title) === wanted)
  if (index === -1) return null
  const section = all[index]
  const next = all.slice(index + 1).find((item) => item.level <= section.level)
  return { ...section, to: next ? next.from : text.length }
}
