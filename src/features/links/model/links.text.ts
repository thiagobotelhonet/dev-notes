/** Fixed locale on purpose, as in nameKey: matching must not change with the UI language. */
export function foldTextUntrimmed(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
}

/** Folded and trimmed: for names and typed text. The search keeps the spaces to map positions. */
export function foldText(text: string): string {
  return foldTextUntrimmed(text).trim()
}
