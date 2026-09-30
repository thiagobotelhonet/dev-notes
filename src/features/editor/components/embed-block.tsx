import { markdown } from "@codemirror/lang-markdown"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import {
  ExternalLinkIcon,
  FileIcon,
  FileQuestionMarkIcon,
  FileSearchIcon,
  FilesIcon,
  FileTextIcon,
  FileXIcon,
  type LucideIcon,
  RepeatIcon,
} from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { type EmbedState, embedState } from "@/features/links"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { basenameOf, type VaultPath } from "@/shared/vault"
import {
  type FollowLinkHandler,
  onNoteChanged,
  readNote,
  resolveInVault,
  watchLinkContext,
} from "../editor.vault"
import { type EmbedRequest, embedBlocks } from "../model/editor.embeds"
import { linkExtensions } from "../model/editor.links"
import { embeddedTheme, tokenTheme } from "../model/editor.theme"

type Message = { icon: LucideIcon; text: string }

/** Icon + text for every state but content (CMP-08, contracts/ui.md). */
function messageOf(state: EmbedState, name: string): Message | null {
  switch (state.kind) {
    case "not-found":
      return { icon: FileXIcon, text: `Nota não encontrada: ${name}` }
    case "section-not-found":
      return {
        icon: FileSearchIcon,
        text: `Seção “${state.heading}” não encontrada em ${name}`,
      }
    case "circular":
      return {
        icon: RepeatIcon,
        text: `Incorporação circular: ${name} já aparece acima`,
      }
    case "empty":
      return { icon: FileIcon, text: `${name} está vazia` }
    case "unsupported":
      return {
        icon: FileQuestionMarkIcon,
        text: "Incorporar este tipo de arquivo ainda não está disponível",
      }
    case "ambiguous":
      return {
        icon: FilesIcon,
        text: `Mais de uma nota chamada “${name}”; indique a pasta`,
      }
    default:
      return null
  }
}

/** Frame, header and messages of an embed (contracts/ui.md "Bloco de incorporação"). */
export function EmbedBlock({
  name,
  heading,
  state,
  onOpen,
  children,
}: {
  name: string
  heading?: string
  state: EmbedState
  onOpen: () => void
  children?: ReactNode
}) {
  const title = heading ? `${name} › ${heading}` : name
  const message = messageOf(state, name)
  return (
    <figure
      aria-label={`Incorporação de ${title}`}
      className="my-2 overflow-hidden rounded-md border bg-muted/40 font-sans"
    >
      <div className="flex items-center gap-2 border-b px-3 py-1 text-sm">
        <FileTextIcon
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Abrir ${name}`}
          onClick={onOpen}
        >
          <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
          Abrir
        </Button>
      </div>
      {state.kind === "loading" ? (
        <div aria-busy="true" className="space-y-2 p-3">
          <span className="sr-only">Carregando…</span>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : message ? (
        <p className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-sm">
          <message.icon aria-hidden="true" className="size-4 shrink-0" />
          {message.text}
        </p>
      ) : (
        children
      )}
    </figure>
  )
}

function EmbeddedEditor({
  path,
  text,
  chain,
  depth,
  follow,
}: {
  path: VaultPath
  text: string
  chain: VaultPath[]
  depth: number
  follow: FollowLinkHandler
}) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const initialText = useRef(text)

  useEffect(() => {
    if (!host.current) return
    const from = () => path
    const resolve = (link: Parameters<typeof resolveInVault>[0]) =>
      resolveInVault(link, path)
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initialText.current,
        extensions: [
          linkExtensions({
            from,
            resolve,
            follow: (link) => follow(link, path),
          }),
          embedBlocks({
            from,
            chain,
            depth: depth + 1,
            resolve,
            mount: (dom, request) => mountEmbed(dom, request, follow),
          }),
          markdown(),
          EditorView.lineWrapping,
          tokenTheme,
          embeddedTheme,
          EditorState.readOnly.of(true),
          EditorView.contentAttributes.of({
            "aria-label": `Conteúdo de ${basenameOf(path)}`,
            "aria-readonly": "true",
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
  }, [path, chain, depth, follow])

  useEffect(() => {
    const editor = view.current
    if (!editor || editor.state.doc.toString() === text) return
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: text },
    })
  }, [text])

  return <div ref={host} />
}

function EmbeddedNote({
  request,
  follow,
}: {
  request: EmbedRequest
  follow: FollowLinkHandler
}) {
  const { link, target, chain, depth } = request
  const path = target.state === "valid" ? target.path : null
  const [text, setText] = useState<string>()

  useEffect(() => {
    if (!path || chain.includes(path)) return
    let active = true
    const load = () => {
      readNote(path).then(
        (content) => {
          if (active) setText(content)
        },
        /* The file is gone: the link state changes and a new block replaces this one. */
        () => {}
      )
    }
    load()
    const stop = onNoteChanged(path, load)
    return () => {
      active = false
      stop()
    }
  }, [path, chain])

  const state = embedState({ target, chain, depth, text })
  const name = path
    ? basenameOf(path)
    : link.target.slice(link.target.lastIndexOf("/") + 1)
  return (
    <EmbedBlock
      name={name}
      heading={target.state === "valid" ? target.heading : undefined}
      state={state}
      onOpen={() => follow(link, link.source)}
    >
      {path && state.kind === "content" && (
        <EmbeddedEditor
          path={path}
          text={state.text}
          chain={chain}
          depth={depth}
          follow={follow}
        />
      )}
    </EmbedBlock>
  )
}

/** Mounts a block inside a CodeMirror widget (plan, Complexity Tracking). */
export function mountEmbed(
  dom: HTMLElement,
  request: EmbedRequest,
  follow: FollowLinkHandler
) {
  const root = createRoot(dom)
  root.render(<EmbeddedNote request={request} follow={follow} />)
  /* The widget may be destroyed while React renders; unmount right after. */
  return () => queueMicrotask(() => root.unmount())
}
