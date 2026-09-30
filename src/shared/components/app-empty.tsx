import type { LucideIcon } from "lucide-react"
import { Button } from "./ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty"

export function AppEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle role="heading" aria-level={2}>
          {title}
        </EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && (
        <EmptyContent>
          <Button onClick={action.onClick}>{action.label}</Button>
        </EmptyContent>
      )}
    </Empty>
  )
}
