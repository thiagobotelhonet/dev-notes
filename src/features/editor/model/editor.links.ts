import { type EditorState, Prec, StateEffect } from "@codemirror/state"
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view"
import {
  type LinkOccurrence,
  type LinkState,
  type LinkTarget,
  parseLinks,
} from "@/features/links"

/** How the editor reaches the vault without knowing it (research R1). */
export interface LinkContext {
  /** Note where the text lives; read on each use, it changes on rename. */
  from(): string
  /** `null` while the link index is not ready. */
  resolve(link: LinkOccurrence): LinkTarget | null
  follow(link: LinkOccurrence): void
}

/** Dispatched when notes appear, vanish or the deleted registry changes (research R9). */
export const linkContextChanged = StateEffect.define<null>()

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? "Cmd" : "Ctrl"

/** The state is also in the hint, not only in the stroke (CMP-08, FR-002). */
const hints: Record<LinkState, string> = {
  valid: `${mod}+clique para abrir`,
  pending: `Nota ainda não existe · ${mod}+clique para criar`,
  broken: `Nota excluída · ${mod}+clique para ver opções`,
  ambiguous: `Mais de uma nota com esse nome · ${mod}+clique para escolher`,
  file: "Arquivo que não é nota",
}

const marks = Object.fromEntries(
  Object.entries(hints).map(([state, title]) => [
    state,
    Decoration.mark({
      class: `cm-link cm-link-${state}`,
      attributes: { title },
    }),
  ])
) as Record<LinkState, Decoration>

function linkAt(state: EditorState, from: string, position: number) {
  return parseLinks(from, state.doc.toString()).find(
    (link) => position >= link.range.start && position <= link.range.end
  )
}

/* Only the visible links are resolved, so the cost follows the screen (research R9). */
function decorate(view: EditorView, context: LinkContext): DecorationSet {
  const links = parseLinks(context.from(), view.state.doc.toString())
  const ranges = []
  for (const link of links) {
    const visible = view.visibleRanges.some(
      (range) => link.range.start < range.to && link.range.end > range.from
    )
    const target = visible ? context.resolve(link) : null
    if (target)
      ranges.push(marks[target.state].range(link.range.start, link.range.end))
  }
  return Decoration.set(ranges)
}

/* Stroke and text style tell the states apart; --brand is never text color (research R2). */
const linkTheme = EditorView.theme({
  ".cm-link": { textUnderlineOffset: "0.2em" },
  ".cm-link-valid": {
    color: "var(--foreground)",
    textDecoration: "underline solid var(--brand)",
  },
  ".cm-link-pending": {
    color: "var(--muted-foreground)",
    textDecoration: "underline dashed var(--muted-foreground)",
  },
  ".cm-link-broken": {
    color: "var(--destructive)",
    textDecoration: "line-through var(--destructive)",
  },
  ".cm-link-ambiguous": {
    color: "var(--foreground)",
    textDecoration: "underline wavy var(--brand)",
  },
  ".cm-link-file": {
    color: "var(--foreground)",
    textDecoration: "underline dotted var(--muted-foreground)",
  },
})

/** Highlight by state, Ctrl/Cmd+click and Mod-Enter to follow (research R3). */
export function linkExtensions(context: LinkContext) {
  const highlighter = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = decorate(view, context)
      }
      update(update: ViewUpdate) {
        const contextChanged = update.transactions.some((transaction) =>
          transaction.effects.some((effect) => effect.is(linkContextChanged))
        )
        if (update.docChanged || update.viewportChanged || contextChanged)
          this.decorations = decorate(update.view, context)
      }
    },
    { decorations: (plugin) => plugin.decorations }
  )

  const followAt = (view: EditorView, position: number) => {
    const link = linkAt(view.state, context.from(), position)
    if (!link) return false
    context.follow(link)
    return true
  }

  return [
    highlighter,
    linkTheme,
    EditorView.domEventHandlers({
      mousedown(event, view) {
        const modifier = isMac ? event.metaKey : event.ctrlKey
        if (!modifier || event.button !== 0) return false
        const position = view.posAtCoords({
          x: event.clientX,
          y: event.clientY,
        })
        if (position === null || !followAt(view, position)) return false
        event.preventDefault()
        return true
      },
    }),
    /* High precedence, but outside a link Mod-Enter keeps its default. */
    Prec.high(
      keymap.of([
        {
          key: "Mod-Enter",
          run: (view) => followAt(view, view.state.selection.main.head),
        },
      ])
    ),
  ]
}
