import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { markdown } from "@codemirror/lang-markdown"
import { EditorState } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"
import { useEffect, useRef } from "react"
import { findSection } from "@/features/links"
import { useVaultStore } from "@/features/vault"
import { AppEditorFrame } from "@/shared/components/app-editor-frame"
import { basenameOf } from "@/shared/vault"
import {
  type FollowLinkHandler,
  resolveInVault,
  watchLinkContext,
} from "../editor.vault"
import { linkCompletion } from "../model/editor.complete"
import { embedBlocks } from "../model/editor.embeds"
import { linkExtensions } from "../model/editor.links"
import { tokenTheme } from "../model/editor.theme"
import { hasPendingEdit } from "../model/note.machine"
import { useNoteStore } from "../note.store"
import { mountEmbed } from "./embed-block"
import { NoteConflictDialog } from "./note-conflict-dialog"

export function NoteEditor({
  onFollowLink,
}: {
  onFollowLink?: FollowLinkHandler
}) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const applyingFromStore = useRef(false)
  const followLink = useRef(onFollowLink)
  followLink.current = onFollowLink
  const path = useNoteStore((state) => state.path)
  const revision = useNoteStore((state) => state.revision)
  const headingRequest = useNoteStore((state) => state.headingRequest)
  const pending = useNoteStore((state) => hasPendingEdit(state))

  useEffect(() => {
    if (!host.current) return
    const from = () => useNoteStore.getState().path ?? ""
    const follow: FollowLinkHandler = (link, source) =>
      followLink.current?.(link, source)
    const resolve = (link: Parameters<typeof resolveInVault>[0]) =>
      resolveInVault(link, from())
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: useNoteStore.getState().buffer,
        extensions: [
          history(),
          linkExtensions({
            from,
            resolve,
            follow: (link) => follow(link, from()),
          }),
          linkCompletion(() => useVaultStore.getState().entries),
          embedBlocks({
            from,
            chain: [],
            depth: 1,
            resolve,
            mount: (dom, request) => mountEmbed(dom, request, follow),
          }),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown(),
          EditorView.lineWrapping,
          tokenTheme,
          EditorView.contentAttributes.of({
            "aria-label": "Conteúdo da nota",
            "aria-multiline": "true",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !applyingFromStore.current)
              useNoteStore.getState().edit(update.state.doc.toString())
          }),
        ],
      }),
    })
    view.current = editor
    const unwatch = watchLinkContext(editor)
    return () => {
      unwatch()
      editor.destroy()
      view.current = null
    }
  }, [])

  /* Content from disk replaces the document without counting as an edit. */
  useEffect(() => {
    const editor = view.current
    if (!editor || revision === 0) return
    const text = useNoteStore.getState().buffer
    if (editor.state.doc.toString() === text) return
    applyingFromStore.current = true
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: text },
    })
    applyingFromStore.current = false
  }, [revision])

  /* A link to a section opens with the cursor on its heading (research R8). */
  useEffect(() => {
    const editor = view.current
    if (!editor || !headingRequest) return
    const section = findSection(
      editor.state.doc.toString(),
      headingRequest.title
    )
    const anchor = section?.from ?? 0
    editor.dispatch({
      selection: { anchor },
      effects: EditorView.scrollIntoView(anchor, { y: "start" }),
    })
    useNoteStore.setState({ headingRequest: null })
  }, [headingRequest])

  return (
    <AppEditorFrame title={path ? basenameOf(path) : ""} pending={pending}>
      <div ref={host} className="h-full" />
      <NoteConflictDialog />
    </AppEditorFrame>
  )
}
