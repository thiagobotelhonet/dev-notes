export type LineEnding = "\n" | "\r\n"

export interface DecodedNote {
  /** Text as the editor sees it: "\n" only, no BOM. */
  text: string
  lineEnding: LineEnding
  bom: boolean
}

const byteOrderMark = "\uFEFF"

/** The first line break decides the file's line ending ("\n" if none). */
export function decodeNote(raw: string): DecodedNote {
  const bom = raw.startsWith(byteOrderMark)
  const body = bom ? raw.slice(1) : raw
  const firstBreak = body.indexOf("\n")
  const lineEnding: LineEnding =
    firstBreak > 0 && body[firstBreak - 1] === "\r" ? "\r\n" : "\n"
  return { text: body.replace(/\r\n/g, "\n"), lineEnding, bom }
}

/** Puts back the original line ending and BOM, so only edited text changes (FR-004). */
export function encodeNote(
  text: string,
  lineEnding: LineEnding,
  bom: boolean
): string {
  const body = lineEnding === "\r\n" ? text.replace(/\n/g, "\r\n") : text
  return bom ? byteOrderMark + body : body
}
