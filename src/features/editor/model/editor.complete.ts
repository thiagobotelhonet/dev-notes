import {
  acceptCompletion,
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  pickedCompletion,
} from "@codemirror/autocomplete"
import { Prec } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"
import { parseLinks, suggestLinks } from "@/features/links"
import type { VaultEntry } from "@/shared/vault"

const emptyMessage =
  "Nenhuma nota encontrada. Continue digitando para criar um link novo."

/** Inserts the link text and closes it with `]]`, unless `]]` already follows. */
function applyLink(insert: string) {
  return (
    view: EditorView,
    completion: Completion,
    from: number,
    to: number
  ) => {
    const closed = view.state.sliceDoc(to, to + 2) === "]]"
    const text = closed ? insert : `${insert}]]`
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length + (closed ? 2 : 0) },
      annotations: pickedCompletion.of(completion),
    })
  }
}

/** The link parser decides what is code, so suggestions and highlight never disagree. */
function linkCompletionSource(notes: () => VaultEntry[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const typed = context.matchBefore(/!?\[\[[^[\]|#\n]*$/)
    if (!typed) return null
    const before = context.state.sliceDoc(0, context.pos)
    const probe = parseLinks("", `${before}x]]`).at(-1)
    if (probe?.range.start !== typed.from) return null
    const from = typed.from + typed.text.indexOf("[[") + 2
    const suggestions = suggestLinks(
      context.state.sliceDoc(from, context.pos),
      notes()
    )
    const options: Completion[] = suggestions.length
      ? suggestions.map((suggestion) => ({
          label: suggestion.name,
          detail: suggestion.folder || "raiz",
          apply: applyLink(suggestion.insert),
        }))
      : [{ label: emptyMessage, apply: () => {} }]
    /* The order is already FR-013's; the editor must not re-rank it. */
    return { from, options, filter: false }
  }
}

/* The list lives inside app-editor-frame (LAY-07): only theme tokens. */
const completionTheme = EditorView.theme({
  ".cm-tooltip.cm-tooltip-autocomplete": {
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
  },
  ".cm-tooltip-autocomplete > ul > li": { padding: "0.25rem 0.5rem" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  ".cm-completionDetail": {
    marginLeft: "0.5rem",
    fontStyle: "normal",
    color: "var(--muted-foreground)",
  },
})

/** Autocomplete of `[[links]]`; arrows, Enter or Tab pick, Esc closes (FR-017). */
export function linkCompletion(notes: () => VaultEntry[]) {
  return [
    autocompletion({ override: [linkCompletionSource(notes)], icons: false }),
    Prec.highest(keymap.of([{ key: "Tab", run: acceptCompletion }])),
    completionTheme,
  ]
}
