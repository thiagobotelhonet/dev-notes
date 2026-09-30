import { isInside, type VaultEntry, type VaultPath } from "@/shared/vault"

export interface DeletionRequest {
  target: VaultPath
  kind: VaultEntry["kind"]
  name: string
  /** Notes inside the folder, recursively (RN-NOTA-009). */
  noteCount: number
  /** Everything that is not a note, canvas included (spec, Edge Cases). */
  otherCount: number
}

export function describeDeletion(
  entries: VaultEntry[],
  target: VaultPath
): DeletionRequest {
  const entry = entries.find((item) => item.path === target)
  const inside = entries.filter(
    (item) => item.path !== target && isInside(item.path, target)
  )
  return {
    target,
    kind: entry?.kind ?? "other",
    name: entry?.name ?? target,
    noteCount: inside.filter((item) => item.kind === "note").length,
    otherCount: inside.filter(
      (item) => item.kind !== "note" && item.kind !== "folder"
    ).length,
  }
}

const count = (value: number, one: string, many: string) =>
  `${value} ${value === 1 ? one : many}`

/** Texts of `app-confirm` (contracts/ui.md "Mensagens"). */
export function deletionMessage(request: DeletionRequest) {
  if (request.kind !== "folder")
    return {
      title: `Excluir “${request.name}”?`,
      description:
        request.kind === "note"
          ? "A nota vai para a lixeira do sistema. Links para ela continuarão no texto das outras notas."
          : "O arquivo vai para a lixeira do sistema.",
    }
  const { noteCount, otherCount } = request
  if (noteCount === 0 && otherCount === 0)
    return {
      title: `Excluir a pasta “${request.name}”?`,
      description: "A pasta não contém notas.",
    }
  const notes = count(noteCount, "nota", "notas")
  const others = count(otherCount, "outro arquivo", "outros arquivos")
  const what =
    noteCount === 0
      ? `A pasta não contém notas; ${others}`
      : otherCount === 0
        ? notes
        : `${notes} e ${others}`
  const verb = noteCount + otherCount === 1 ? "irá" : "irão"
  return {
    title: `Excluir a pasta “${request.name}”?`,
    description: `${what} ${verb} para a lixeira do sistema.`,
  }
}
