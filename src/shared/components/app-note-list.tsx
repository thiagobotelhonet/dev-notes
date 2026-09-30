import type { LucideIcon } from "lucide-react"
import type { Snippet } from "@/shared/lib/snippet"
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
  /** The line split around the occurrence; the list draws the highlight. */
  text: Snippet
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
  /** Short extra fact beside the folder, e.g. "3 ocorrências". */
  meta?: string
  /** Choosing the note itself, not one of its snippets. */
  onOpen?: () => void
  snippets: NoteListSnippet[]
}

function NoteHeader({ item }: { item: NoteListItem }) {
  const content = (
    <>
      <ItemMedia variant="icon">
        <item.icon aria-hidden="true" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>{item.title}</ItemTitle>
        <ItemDescription>
          {item.description}
          {item.meta && ` · ${item.meta}`}
        </ItemDescription>
      </ItemContent>
    </>
  )
  return item.onOpen ? (
    <Button
      variant="ghost"
      onClick={item.onOpen}
      className="h-auto justify-start gap-2 px-1 py-1 text-left font-normal"
    >
      {content}
    </Button>
  ) : (
    <div className="flex items-center gap-2">{content}</div>
  )
}

/** Notes shown the same way in backlinks, search, history and snippets (LAY-02). */
export function AppNoteList({ items }: { items: NoteListItem[] }) {
  return (
    <ItemGroup className="gap-1">
      {items.map((item) => (
        <Item key={item.key} size="sm" className="flex-col items-stretch gap-1">
          <NoteHeader item={item} />
          {item.snippets.map((snippet) => (
            <div key={snippet.key} className="flex items-start gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={snippet.onOpen}
                className="h-auto min-w-0 flex-1 justify-start whitespace-normal py-1 text-left font-normal text-muted-foreground"
              >
                <span className="min-w-0 break-words">
                  {snippet.text.before}
                  {/* Occurrence highlight, the same everywhere (brand.md §2.4). */}
                  <mark className="rounded-sm bg-brand/20 px-0.5 text-foreground">
                    {snippet.text.match}
                  </mark>
                  {snippet.text.after}
                </span>
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
