import type { ReactNode } from "react"
import { ScrollArea } from "./ui/scroll-area"

/** Same header and scrolling in every side panel (LAY-03); empty states use `AppEmpty`. */
export function AppPanel({
  title,
  actions,
  children,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="flex h-full min-h-0 flex-col bg-background text-foreground"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <h2 className="min-w-0 flex-1 truncate font-medium text-sm">{title}</h2>
        {actions}
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-2">{children}</div>
      </ScrollArea>
    </section>
  )
}
