import { FolderIcon, FolderRootIcon } from "lucide-react"
import { toast } from "sonner"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command"
import { isInside, parentOf, type VaultPath } from "@/shared/vault"
import { VaultActionError } from "../model/vault.operations"
import { useVaultStore } from "../vault.store"

/** Picks the destination folder of "Mover para…" (contracts/ui.md). */
export function VaultMoveDialog({
  path,
  onClose,
}: {
  path: VaultPath | null
  onClose: () => void
}) {
  const entries = useVaultStore((state) => state.entries)
  const entry = entries.find((item) => item.path === path)
  const folders = entries.filter(
    (item) =>
      item.kind === "folder" &&
      !(entry?.kind === "folder" && isInside(item.path, entry.path))
  )

  const moveTo = async (folder: VaultPath) => {
    if (!path) return
    onClose()
    try {
      await useVaultStore.getState().moveEntry(path, folder)
    } catch (error) {
      toast.error(
        error instanceof VaultActionError
          ? error.message
          : "Não foi possível mover."
      )
    }
  }

  return (
    <CommandDialog
      open={path !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={`Mover “${entry?.name ?? ""}” para…`}
      description="Escolha a pasta de destino."
    >
      <Command>
        <CommandInput placeholder="Buscar pasta" aria-label="Buscar pasta" />
        <CommandList>
          <CommandEmpty>Nenhuma pasta encontrada.</CommandEmpty>
          <CommandGroup heading="Pastas">
            <CommandItem
              value="/ raiz do vault"
              disabled={path !== null && parentOf(path) === ""}
              onSelect={() => void moveTo("")}
            >
              <FolderRootIcon aria-hidden="true" />
              Raiz do vault
            </CommandItem>
            {folders.map((folder) => (
              <CommandItem
                key={folder.path}
                value={folder.path}
                disabled={path !== null && parentOf(path) === folder.path}
                onSelect={() => void moveTo(folder.path)}
              >
                <FolderIcon aria-hidden="true" />
                {folder.path}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
