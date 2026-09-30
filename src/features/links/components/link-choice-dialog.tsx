import { FileTextIcon } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command"
import { basenameOf, parentOf, type VaultPath } from "@/shared/vault"

/** Picks one of the notes of an ambiguous link (FR-010, contracts/ui.md). */
export function LinkChoiceDialog({
  name,
  candidates,
  onChoose,
  onCancel,
}: {
  /** The repeated name; `null` keeps the dialog closed. */
  name: string | null
  candidates: VaultPath[]
  onChoose: (path: VaultPath) => void
  onCancel: () => void
}) {
  return (
    <CommandDialog
      open={name !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      title="Qual nota abrir?"
      description={`Existe mais de uma nota chamada “${name ?? ""}”.`}
    >
      <Command>
        <CommandList>
          <CommandGroup heading={`Notas chamadas “${name ?? ""}”`}>
            {candidates.map((path) => (
              <CommandItem
                key={path}
                value={path}
                onSelect={() => onChoose(path)}
              >
                <FileTextIcon aria-hidden="true" />
                {basenameOf(path)}
                <span className="ml-auto text-muted-foreground text-xs">
                  {parentOf(path) || "raiz"}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
