import { AppChoiceDialog } from "@/shared/components/app-choice-dialog"
import { basenameOf } from "@/shared/vault"
import { useNoteStore } from "../note.store"

/** Outside edit over an unsaved edit: the user picks a version (FR-022). */
export function NoteConflictDialog() {
  const path = useNoteStore((state) => state.path)
  const conflict = useNoteStore((state) => state.status === "conflict")
  const keepMine = useNoteStore((state) => state.keepMine)
  const keepExternal = useNoteStore((state) => state.keepExternal)
  return (
    <AppChoiceDialog
      open={conflict && path !== null}
      title={`“${path ? basenameOf(path) : ""}” foi alterada fora do Dev Notes`}
      description="Você tem alterações que ainda não foram gravadas."
      primary={{
        label: "Manter minha versão",
        onSelect: () => void keepMine(),
      }}
      secondary={{
        label: "Usar versão do arquivo",
        onSelect: () => void keepExternal(),
      }}
    />
  )
}
