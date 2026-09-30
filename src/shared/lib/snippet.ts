/** The occurrence line split around the occurrence (spec 003, data-model "Trecho"). */
export interface Snippet {
  before: string
  match: string
  after: string
}

const maxSnippetLength = 120

/** Positions are in the raw text; BOM and CR never reach the snippet. */
export function snippetOf(text: string, start: number, end: number): Snippet {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1
  const newline = text.indexOf("\n", end)
  const lineEnd = newline === -1 ? text.length : newline
  let before = text.slice(lineStart, start).replace(/^﻿/, "").trimStart()
  const match = text.slice(start, end)
  let after = text.slice(end, lineEnd).replace(/\r$/, "").trimEnd()
  const room = maxSnippetLength - match.length
  if (before.length + after.length > room) {
    const half = Math.max(0, Math.floor(room / 2))
    if (before.length > half) before = `…${before.slice(-half)}`
    if (after.length > half) after = `${after.slice(0, half)}…`
  }
  return { before, match, after }
}
