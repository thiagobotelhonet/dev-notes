import { EditorView } from "@codemirror/view"

/* Only theme tokens from styles.css (COR-01, LAY-07). */
export const tokenTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
  },
  ".cm-content": {
    fontFamily: "var(--font-mono)",
    caretColor: "var(--foreground)",
    padding: "1rem 0",
  },
  ".cm-line": { padding: "0 1.5rem" },
  /* Embed blocks line up with the text and step in a little (contracts/ui.md). */
  ".cm-embed": { padding: "0 1.5rem 0 2.5rem" },
  "&.cm-focused": { outline: "none" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "var(--foreground)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "color-mix(in oklab, var(--ring) 25%, transparent)",
  },
})

/* An embedded note sits inside the open one: no own height nor padding. */
export const embeddedTheme = EditorView.theme({
  "&": { height: "auto", backgroundColor: "transparent" },
  ".cm-content": { padding: "0.5rem 0" },
  ".cm-line": { padding: "0 0.75rem" },
  ".cm-embed": { padding: "0 0.75rem 0 1.75rem" },
})
