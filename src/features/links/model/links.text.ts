/** Fixed locale on purpose, as in nameKey: matching must not change with the UI language. */
export function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase("pt-BR")
}
