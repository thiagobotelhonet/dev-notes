import { MoreHorizontalIcon } from "lucide-react"
import { type KeyboardEvent, type ReactNode, useMemo, useState } from "react"
import { toast } from "sonner"
import { appConfig } from "@/config/app"
import { AppConfirm } from "@/shared/components/app-confirm"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Kbd } from "@/shared/components/ui/kbd"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuSkeleton,
} from "@/shared/components/ui/sidebar"
import { parentOf, type VaultEntry, type VaultPath } from "@/shared/vault"
import { deletionMessage, describeDeletion } from "../model/vault.deletion"
import { VaultActionError } from "../model/vault.operations"
import { useVaultStore } from "../vault.store"
import { VaultMoveDialog } from "./vault-move-dialog"
import {
  InlineNameField,
  type TreeAction,
  VaultTreeItem,
} from "./vault-tree-item"

type Editing =
  | { mode: "new-folder"; parent: VaultPath }
  | { mode: "rename"; path: VaultPath }
  | null

const shortcuts = {
  newNote: "Ctrl+N",
  newFolder: "Ctrl+Shift+N",
  rename: "F2",
  move: "Ctrl+Shift+M",
  remove: "Delete",
}

const collator = new Intl.Collator(appConfig.locale, {
  sensitivity: "base",
  numeric: true,
})
function sortEntries(a: VaultEntry, b: VaultEntry) {
  if ((a.kind === "folder") !== (b.kind === "folder"))
    return a.kind === "folder" ? -1 : 1
  return collator.compare(a.name, b.name)
}

function childrenByFolder(entries: VaultEntry[]) {
  const map = new Map<VaultPath, VaultEntry[]>()
  for (const entry of entries) {
    if (entry.kind === "other") continue
    const parent = parentOf(entry.path)
    map.set(parent, [...(map.get(parent) ?? []), entry])
  }
  for (const list of map.values()) list.sort(sortEntries)
  return map
}

export function VaultTreeSkeleton() {
  return (
    <div aria-busy="true" className="px-2">
      <span className="sr-only">Carregando…</span>
      <SidebarMenu>
        {["a", "b", "c", "d", "e", "f"].map((key) => (
          <li key={key}>
            <SidebarMenuSkeleton showIcon />
          </li>
        ))}
      </SidebarMenu>
    </div>
  )
}

export function VaultTree({
  activePath,
  onOpenNote,
}: {
  activePath: VaultPath | null
  onOpenNote: (path: VaultPath) => void
}) {
  const entries = useVaultStore((state) => state.entries)
  const [expanded, setExpanded] = useState<Set<VaultPath>>(new Set())
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<VaultPath | null>(null)
  const [moving, setMoving] = useState<VaultPath | null>(null)
  const children = useMemo(() => childrenByFolder(entries), [entries])
  const byPath = useMemo(
    () => new Map(entries.map((entry) => [entry.path, entry])),
    [entries]
  )

  const expand = (folder: VaultPath) =>
    setExpanded((current) => {
      const next = new Set(current)
      for (let path = folder; path !== ""; path = parentOf(path)) next.add(path)
      return next
    })
  const toggle = (folder: VaultPath, open: boolean) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (open) next.add(folder)
      else next.delete(folder)
      return next
    })

  const newNote = async (folder: VaultPath) => {
    try {
      const path = await useVaultStore.getState().createNote(folder)
      expand(folder)
      onOpenNote(path)
    } catch {
      toast.error("Não foi possível criar a nota.")
    }
  }
  const newFolder = (parent: VaultPath) => {
    expand(parent)
    setEditing({ mode: "new-folder", parent })
  }
  const submitNewFolder = async (parent: VaultPath, name: string) => {
    try {
      const path = await useVaultStore.getState().createFolder(parent, name)
      setEditing(null)
      expand(path)
      return null
    } catch (error) {
      if (error instanceof VaultActionError) return error.message
      return "Não foi possível criar a pasta."
    }
  }

  const submitRename = async (path: VaultPath, name: string) => {
    try {
      await useVaultStore.getState().renameEntry(path, name)
      setEditing(null)
      return null
    } catch (error) {
      if (error instanceof VaultActionError) return error.message
      return "Não foi possível renomear."
    }
  }
  const confirmDelete = async () => {
    const path = deleting
    setDeleting(null)
    if (path) await useVaultStore.getState().deleteEntry(path)
  }

  const entryActions = (path: VaultPath): TreeAction[] => [
    {
      label: "Renomear",
      shortcut: shortcuts.rename,
      onSelect: () => setEditing({ mode: "rename", path }),
    },
    {
      label: "Mover para…",
      shortcut: shortcuts.move,
      onSelect: () => setMoving(path),
    },
    {
      label: "Excluir",
      shortcut: shortcuts.remove,
      onSelect: () => setDeleting(path),
    },
  ]

  const folderActions = (folder: VaultPath): TreeAction[] => [
    {
      label: "Nova nota",
      shortcut: shortcuts.newNote,
      onSelect: () => void newNote(folder),
    },
    {
      label: "Nova pasta",
      shortcut: shortcuts.newFolder,
      onSelect: () => newFolder(folder),
    },
  ]
  const actionsFor = (entry: VaultEntry): TreeAction[] =>
    entry.kind === "folder"
      ? [...folderActions(entry.path), ...entryActions(entry.path)]
      : entryActions(entry.path)

  const folderOf = (path: VaultPath | undefined) => {
    if (!path) return ""
    return byPath.get(path)?.kind === "folder" ? path : parentOf(path)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [
      ...event.currentTarget.querySelectorAll<HTMLElement>("[data-tree-item]"),
    ]
    const current = (
      document.activeElement as HTMLElement | null
    )?.closest<HTMLElement>("[data-tree-item]")
    const path = current?.dataset.treeItem
    const index = current ? items.indexOf(current) : -1
    const ctrl = event.ctrlKey || event.metaKey
    if (path && event.key === "F2") {
      event.preventDefault()
      setEditing({ mode: "rename", path })
    } else if (path && event.key === "Delete") {
      event.preventDefault()
      setDeleting(path)
    } else if (
      path &&
      ctrl &&
      event.shiftKey &&
      event.key.toLowerCase() === "m"
    ) {
      event.preventDefault()
      setMoving(path)
    } else if (ctrl && event.shiftKey && event.key.toLowerCase() === "n") {
      event.preventDefault()
      newFolder(folderOf(path))
    } else if (ctrl && !event.shiftKey && event.key.toLowerCase() === "n") {
      event.preventDefault()
      void newNote(folderOf(path))
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const step = event.key === "ArrowDown" ? 1 : -1
      items[Math.min(Math.max(index + step, 0), items.length - 1)]?.focus()
    } else if (path && byPath.get(path)?.kind === "folder") {
      if (event.key === "ArrowRight") {
        event.preventDefault()
        toggle(path, true)
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        toggle(path, false)
      }
    }
  }

  const newFolderField = (parent: VaultPath) =>
    editing?.mode === "new-folder" && editing.parent === parent ? (
      <li>
        <InlineNameField
          label="Nome da nova pasta"
          initialValue=""
          onSubmit={(name) => submitNewFolder(parent, name)}
          onCancel={() => setEditing(null)}
        />
      </li>
    ) : null

  const renderLevel = (folder: VaultPath): ReactNode =>
    (children.get(folder) ?? []).map((entry) => (
      <VaultTreeItem
        key={entry.path}
        entry={entry}
        active={entry.path === activePath}
        expanded={expanded.has(entry.path)}
        onToggle={(open) => toggle(entry.path, open)}
        onOpen={() => onOpenNote(entry.path)}
        actions={actionsFor(entry)}
        editing={
          editing?.mode === "rename" && editing.path === entry.path ? (
            <InlineNameField
              label={`Novo nome de ${entry.name}`}
              initialValue={entry.name}
              onSubmit={(name) => submitRename(entry.path, name)}
              onCancel={() => setEditing(null)}
            />
          ) : undefined
        }
      >
        {entry.kind === "folder" && (
          <>
            {newFolderField(entry.path)}
            {renderLevel(entry.path)}
          </>
        )}
      </VaultTreeItem>
    ))

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Arquivos</SidebarGroupLabel>
      <DropdownMenu>
        <SidebarGroupAction
          render={<DropdownMenuTrigger />}
          aria-label="Ações da raiz do vault"
        >
          <MoreHorizontalIcon aria-hidden="true" />
        </SidebarGroupAction>
        <DropdownMenuContent side="right" align="start">
          {folderActions("").map((action) => (
            <DropdownMenuItem key={action.label} onClick={action.onSelect}>
              {action.label}
              {action.shortcut && (
                <DropdownMenuShortcut>
                  <Kbd>{action.shortcut}</Kbd>
                </DropdownMenuShortcut>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <SidebarGroupContent>
        <nav aria-label="Arquivos do vault" onKeyDown={onKeyDown}>
          <SidebarMenu>
            {newFolderField("")}
            {renderLevel("")}
          </SidebarMenu>
        </nav>
      </SidebarGroupContent>
      <AppConfirm
        open={deleting !== null}
        {...deletionMessage(describeDeletion(entries, deleting ?? ""))}
        confirmLabel="Excluir"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
      {/* Mounted only while open: its hidden title would otherwise stay in the page. */}
      {moving !== null && (
        <VaultMoveDialog path={moving} onClose={() => setMoving(null)} />
      )}
    </SidebarGroup>
  )
}
