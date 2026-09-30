import {
  ChevronRightIcon,
  FileTextIcon,
  FolderIcon,
  LayoutDashboardIcon,
  MoreHorizontalIcon,
} from "lucide-react"
import { type ReactNode, useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/shared/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Field, FieldError } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { Kbd } from "@/shared/components/ui/kbd"
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/shared/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import type { VaultEntry } from "@/shared/vault"

export interface TreeAction {
  label: string
  shortcut?: string
  onSelect: () => void
}

function ActionMenus({
  name,
  actions,
  children,
}: {
  name: string
  actions: TreeAction[]
  children: ReactNode
}) {
  /* Siblings, not nested: a menu inside another becomes its submenu. */
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger render={<div />}>{children}</ContextMenuTrigger>
        <ContextMenuContent className="min-w-56">
          {actions.map((action) => (
            <ContextMenuItem key={action.label} onClick={action.onSelect}>
              {action.label}
              {action.shortcut && (
                <ContextMenuShortcut>
                  <Kbd>{action.shortcut}</Kbd>
                </ContextMenuShortcut>
              )}
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenu>
      <DropdownMenu>
        <SidebarMenuAction
          render={<DropdownMenuTrigger />}
          showOnHover
          aria-label={`Ações de ${name}`}
        >
          <MoreHorizontalIcon aria-hidden="true" />
        </SidebarMenuAction>
        {/* The trigger is tiny; the menu must not take its width. */}
        <DropdownMenuContent
          side="right"
          align="start"
          className="w-auto min-w-56"
        >
          {actions.map((action) => (
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
    </>
  )
}

/** Inline name editor (new folder, rename): Enter confirms, Esc cancels. */
export function InlineNameField({
  label,
  initialValue,
  onSubmit,
  onCancel,
}: {
  label: string
  initialValue: string
  /** Resolves to an error message to show, or null when done. */
  onSubmit: (value: string) => Promise<string | null>
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const errorId = `name-error-${label.replace(/\W+/g, "-")}`
  const submit = async () => {
    if (busy) return
    setBusy(true)
    const message = await onSubmit(value)
    setBusy(false)
    setError(message)
  }
  return (
    <Field data-invalid={error ? true : undefined} className="px-2 py-1">
      <Input
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={value}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          setValue(event.currentTarget.value)
          setError(null)
        }}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === "Enter") {
            event.preventDefault()
            void submit()
          } else if (event.key === "Escape") {
            event.preventDefault()
            onCancel()
          }
        }}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}

const icons = {
  note: FileTextIcon,
  canvas: LayoutDashboardIcon,
  other: FileTextIcon,
  folder: FolderIcon,
}

export function VaultTreeItem({
  entry,
  active,
  expanded,
  onToggle,
  onOpen,
  actions,
  editing,
  children,
}: {
  entry: VaultEntry
  active: boolean
  expanded: boolean
  onToggle: (open: boolean) => void
  onOpen: () => void
  actions: TreeAction[]
  /** Inline field shown in place of the item (rename). */
  editing?: ReactNode
  /** Folder content (children items and inline fields). */
  children?: ReactNode
}) {
  const Icon = icons[entry.kind]
  if (editing) return <SidebarMenuItem>{editing}</SidebarMenuItem>

  if (entry.kind === "folder") {
    return (
      <SidebarMenuItem>
        <Collapsible
          open={expanded}
          onOpenChange={onToggle}
          className="group/collapsible"
        >
          <ActionMenus name={entry.name} actions={actions}>
            <SidebarMenuButton
              data-tree-item={entry.path}
              render={<CollapsibleTrigger />}
            >
              <ChevronRightIcon
                aria-hidden="true"
                className="transition-transform group-data-open/collapsible:rotate-90"
              />
              <Icon aria-hidden="true" />
              <span>{entry.name}</span>
            </SidebarMenuButton>
          </ActionMenus>
          <CollapsibleContent>
            <SidebarMenuSub className="mr-0 pr-0">{children}</SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    )
  }

  if (entry.kind === "canvas") {
    return (
      <SidebarMenuItem>
        <ActionMenus name={entry.name} actions={actions}>
          <Tooltip>
            <TooltipTrigger render={<div />}>
              <SidebarMenuButton
                data-tree-item={entry.path}
                aria-disabled="true"
                className="text-muted-foreground"
              >
                <Icon aria-hidden="true" />
                <span>{entry.name}</span>
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent side="right">
              Abrir canvas ainda não está disponível
            </TooltipContent>
          </Tooltip>
        </ActionMenus>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <ActionMenus name={entry.name} actions={actions}>
        <SidebarMenuButton
          data-tree-item={entry.path}
          isActive={active}
          aria-current={active ? "page" : undefined}
          onClick={entry.kind === "note" ? onOpen : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{entry.name}</span>
        </SidebarMenuButton>
      </ActionMenus>
    </SidebarMenuItem>
  )
}
