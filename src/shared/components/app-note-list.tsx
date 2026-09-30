import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "./ui/item"

export interface NoteListSnippet {
  key: string
  /** The excerpt, with the occurrence highlighted. */
  content: ReactNode
  badge?: string
  onOpen: () => void
  action?: { label: string; accessibleLabel: string; onClick: () => void }
}

export interface NoteListItem {
  key: string
  icon: LucideIcon
  title: string
  /** The folder ("raiz" at the vault root). */
  description: string
  snippets: NoteListSnippet[]
}

/** Notes shown the same way in backlinks, search, history and snippets (LAY-02). */
export function AppNoteList({ items }: { items: NoteListItem[] }) {
  return (
    <ItemGroup className="gap-1">
      {items.map((item) => (
        <Item key={item.key} size="sm" className="flex-col items-stretch gap-1">
          <div className="flex items-center gap-2">
            <ItemMedia variant="icon">
              <item.icon aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{item.title}</ItemTitle>
              <ItemDescription>{item.description}</ItemDescription>
            </ItemContent>
          </div>
          {item.snippets.map((snippet) => (
            <div key={snippet.key} className="flex items-start gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={snippet.onOpen}
                className="h-auto min-w-0 flex-1 justify-start whitespace-normal py-1 text-left font-normal text-muted-foreground"
              >
                <span className="min-w-0 break-words">{snippet.content}</span>
                {snippet.badge && (
                  <Badge variant="secondary">{snippet.badge}</Badge>
                )}
              </Button>
              {snippet.action && (
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={snippet.action.accessibleLabel}
                  onClick={snippet.action.onClick}
                >
                  {snippet.action.label}
                </Button>
              )}
            </div>
          ))}
        </Item>
      ))}
    </ItemGroup>
  )
}
