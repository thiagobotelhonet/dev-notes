import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"

interface Choice {
  label: string
  onSelect: () => void
}

/** Two named choices and no way to close without picking one. */
export function AppChoiceDialog({
  open,
  title,
  description,
  primary,
  secondary,
}: {
  open: boolean
  title: string
  description: string
  primary: Choice
  secondary: Choice
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction variant="outline" onClick={secondary.onSelect}>
            {secondary.label}
          </AlertDialogAction>
          <AlertDialogAction onClick={primary.onSelect}>
            {primary.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
