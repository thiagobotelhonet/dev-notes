import { type EditorState, type Range, StateField } from "@codemirror/state"
import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view"
import {
  embedState,
  type LinkOccurrence,
  type LinkTarget,
  parseLinks,
} from "@/features/links"
import type { VaultPath } from "@/shared/vault"
import { linkContextChanged } from "./editor.links"

/** One `![[...]]` to show below its line (data-model "EmbedNode"). */
export interface EmbedRequest {
  link: LinkOccurrence
  target: LinkTarget
  /** Notes above the block, from the open note down to `link.source`. */
  chain: VaultPath[]
  depth: number
}

export interface EmbedOptions {
  /** Note of this document; read on each use, it changes on rename. */
  from(): VaultPath
  /** Notes above this document (empty for the open note). */
  chain: VaultPath[]
  /** Depth of the blocks of this document: 1 in the open note. */
  depth: number
  resolve(link: LinkOccurrence): LinkTarget | null
  /** Fills the block; returns the cleanup. Keeps CodeMirror apart from React. */
  mount(dom: HTMLElement, request: EmbedRequest): () => void
}

class EmbedWidget extends WidgetType {
  private cleanups = new WeakMap<HTMLElement, () => void>()

  constructor(
    readonly request: EmbedRequest,
    private readonly mount: EmbedOptions["mount"]
  ) {
    super()
  }

  override eq(other: EmbedWidget) {
    const a = this.request
    const b = other.request
    return (
      a.link.target === b.link.target &&
      a.link.subpath === b.link.subpath &&
      a.depth === b.depth &&
      a.chain.join("\n") === b.chain.join("\n") &&
      JSON.stringify(a.target) === JSON.stringify(b.target)
    )
  }

  toDOM(view: EditorView) {
    const dom = document.createElement("div")
    dom.className = "cm-embed"
    dom.contentEditable = "false"
    /* The block grows when its content arrives; the editor re-measures. */
    const resize = new ResizeObserver(() => view.requestMeasure())
    resize.observe(dom)
    const unmount = this.mount(dom, this.request)
    this.cleanups.set(dom, () => {
      resize.disconnect()
      unmount()
    })
    return dom
  }

  override destroy(dom: HTMLElement) {
    this.cleanups.get(dom)?.()
  }

  /* Clicks and keys inside the block never move the cursor of the note around it. */
  override ignoreEvent() {
    return true
  }
}

function blocks(state: EditorState, options: EmbedOptions): DecorationSet {
  const from = options.from()
  const chain = [...options.chain, from]
  const ranges: Range<Decoration>[] = []
  for (const link of parseLinks(from, state.doc.toString())) {
    if (!link.embed) continue
    const target = options.resolve(link)
    if (!target) continue
    const request = { link, target, chain, depth: options.depth }
    /* Past the depth limit only the `![[...]]` text stays (spec, Assumptions). */
    if (embedState(request).kind === "too-deep") continue
    ranges.push(
      Decoration.widget({
        widget: new EmbedWidget(request, options.mount),
        block: true,
        side: 1,
      }).range(state.doc.lineAt(link.range.end).to)
    )
  }
  return Decoration.set(ranges, true)
}

/** A StateField, because CodeMirror refuses block decorations from a ViewPlugin (research R6). */
export function embedBlocks(options: EmbedOptions) {
  return StateField.define<DecorationSet>({
    create: (state) => blocks(state, options),
    update(value, transaction) {
      const contextChanged = transaction.effects.some((effect) =>
        effect.is(linkContextChanged)
      )
      if (transaction.docChanged || contextChanged)
        return blocks(transaction.state, options)
      return value
    },
    provide: (field) => EditorView.decorations.from(field),
  })
}
