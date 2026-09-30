import { useRef } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"

/** Focus starts on Cancelar so Enter never confirms (LAY-04); `tone="default"` when nothing is destroyed. */
export function AppConfirm({
  open,
  title,
  description,
  confirmLabel,
  tone = "destructive",
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  tone?: "destructive" | "default"
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancel = useRef<HTMLButtonElement>(null)
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <AlertDialogContent initialFocus={cancel}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant={tone} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
