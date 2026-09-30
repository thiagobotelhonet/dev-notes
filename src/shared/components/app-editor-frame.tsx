import { CircleDotIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Badge } from "./ui/badge"

/** The only non-shadcn area (LAY-07); the pending mark is icon + text (CMP-08). */
export function AppEditorFrame({
  title,
  pending,
  actions,
  children,
}: {
  title: string
  pending: boolean
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="flex h-full min-h-0 flex-col bg-background text-foreground"
    >
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <h1 className="truncate font-medium text-sm">{title}</h1>
        {pending && (
          <Badge variant="secondary" role="status">
            <CircleDotIcon aria-hidden="true" />
            Não gravado
          </Badge>
        )}
        {actions && <div className="ml-auto flex items-center">{actions}</div>}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  )
}
