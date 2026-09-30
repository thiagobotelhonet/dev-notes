import { FileTextIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { suggestLinks } from "@/features/links"
import { useVaultStore } from "@/features/vault"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command"
import type { VaultPath } from "@/shared/vault"

/** Opens a note by name, keyboard only (RN-BUSCA-005); same order as the link autocomplete (FR-002). */
export function QuickSearchDialog({
  open,
  onOpenChange,
  onOpen,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpen: (path: VaultPath) => void
}) {
  const entries = useVaultStore((state) => state.entries)
  const [text, setText] = useState("")
  const results = useMemo(
    () => (text.trim() ? suggestLinks(text, entries) : []),
    [text, entries]
  )
  /* Controlled, so Enter always has the first result when the list changes. */
  const [chosen, setChosen] = useState("")
  const active = results.some((result) => result.path === chosen)
    ? chosen
    : (results[0]?.path ?? "")

  const change = (next: boolean) => {
    if (!next) setText("")
    onOpenChange(next)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={change}
      title="Abrir nota"
      description="Digite parte do nome da nota"
    >
      <Command shouldFilter={false} value={active} onValueChange={setChosen}>
        <CommandInput
          placeholder="Nome da nota"
          value={text}
          onValueChange={setText}
        />
        <CommandList>
          <CommandEmpty>
            {text.trim()
              ? "Nenhuma nota com esse nome."
              : "Digite parte do nome da nota."}
          </CommandEmpty>
          {results.map((result) => (
            <CommandItem
              key={result.path}
              value={result.path}
              onSelect={() => {
                change(false)
                onOpen(result.path)
              }}
            >
              <FileTextIcon aria-hidden="true" />
              {/* The item already ends with an ml-auto check icon; the name takes the room so the folder lines up. */}
              <span className="min-w-0 flex-1 truncate">{result.name}</span>
              <span className="text-muted-foreground text-xs">
                {result.folder || "raiz"}
              </span>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
