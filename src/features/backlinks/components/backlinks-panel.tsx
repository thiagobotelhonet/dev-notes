import {
  ChevronRightIcon,
  FileTextIcon,
  Link2OffIcon,
  XIcon,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import type { LinkIndex } from "@/features/links"
import { useVaultStore } from "@/features/vault"
import { AppEmpty } from "@/shared/components/app-empty"
import {
  AppNoteList,
  type NoteListItem,
  type NoteListSnippet,
} from "@/shared/components/app-note-list"
import { AppPanel } from "@/shared/components/app-panel"
import { Button } from "@/shared/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible"
import { Skeleton } from "@/shared/components/ui/skeleton"
import type { VaultPath } from "@/shared/vault"
import {
  backlinkGroups,
  mentionGroups,
  type NoteGroup,
  type Occurrence,
} from "../model/backlinks.list"

const refreshDelayMs = 300

interface PanelData {
  links: NoteGroup[]
  mentions: NoteGroup[]
  shortName: boolean
}

function toItems(
  groups: NoteGroup[],
  onOpen: (path: VaultPath, offset: number) => void,
  action?: (
    group: NoteGroup,
    occurrence: Occurrence
  ) => NoteListSnippet["action"]
): NoteListItem[] {
  return groups.map((group) => ({
    key: group.source,
    icon: FileTextIcon,
    title: group.name,
    description: group.folder || "raiz",
    snippets: group.occurrences.map((occurrence) => ({
      key: String(occurrence.start),
      text: occurrence.snippet,
      badge: occurrence.embed ? "incorporação" : undefined,
      onOpen: () => onOpen(group.source, occurrence.start),
      action: action?.(group, occurrence),
    })),
  }))
}

/** Notes that point to the open one and notes that cite it (RN-BACK-001..003). */
export function BacklinksPanel({
  path,
  onOpen,
  onClose,
}: {
  path: VaultPath
  onOpen: (path: VaultPath, offset: number) => void
  onClose: () => void
}) {
  const linkIndex = useVaultStore((state) => state.linkIndex)
  const [data, setData] = useState<PanelData | null>(null)
  /* Mentions start folded for every note (RN-BACK-002): open only for the note it was opened on. */
  const [mentionsOpenFor, setMentionsOpenFor] = useState<VaultPath | null>(null)

  const compute = useCallback(
    (index: LinkIndex | null) => {
      if (!index) return setData(null)
      const mentions = mentionGroups(index, path)
      setData({
        links: backlinkGroups(index, path),
        mentions: mentions.groups,
        shortName: mentions.shortName,
      })
    },
    [path]
  )
  const recompute = useCallback(
    () => compute(useVaultStore.getState().linkIndex),
    [compute]
  )

  /* Right away when the note or the index changes (SC-001). */
  useEffect(() => compute(linkIndex), [compute, linkIndex])

  /* Later changes are grouped: every autosave changes entries (research R6). */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = useVaultStore.subscribe((state, previous) => {
      if (state.entries === previous.entries) return
      clearTimeout(timer)
      timer = setTimeout(recompute, refreshDelayMs)
    })
    return () => {
      stop()
      clearTimeout(timer)
    }
  }, [recompute])

  /* RN-BACK-004: one mention at a time, into a link to the open note. */
  const linkAction = (
    group: NoteGroup,
    occurrence: Occurrence
  ): NoteListSnippet["action"] => ({
    label: "Linkar",
    accessibleLabel: `Linkar menção em ${group.name}`,
    onClick: async () => {
      const result = await useVaultStore.getState().linkMention(
        {
          path: group.source,
          start: occurrence.start,
          end: occurrence.end,
          text: occurrence.snippet.match,
        },
        path
      )
      if (result === "linked")
        toast.success(`Menção em “${group.name}” virou link.`)
      else if (result === "changed")
        toast.warning(
          `“${group.name}” mudou fora do Dev Notes. A lista foi atualizada.`
        )
      else
        toast.error(
          `Não foi possível gravar “${group.name}”. Nada foi alterado.`
        )
      recompute()
    },
  })

  return (
    <AppPanel
      title="Backlinks"
      actions={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Esconder backlinks"
          onClick={onClose}
        >
          <XIcon aria-hidden="true" />
        </Button>
      }
    >
      {data === null ? (
        <div aria-busy="true" className="flex flex-col gap-2 p-1">
          <span className="sr-only">Carregando…</span>
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : (
        <>
          <section
            aria-labelledby="backlinks-links"
            className="flex flex-col gap-2"
          >
            <h3
              id="backlinks-links"
              className="px-1 font-medium text-muted-foreground text-xs"
            >
              Links para esta nota ({data.links.length})
            </h3>
            {data.links.length ? (
              <AppNoteList items={toItems(data.links, onOpen)} />
            ) : (
              <AppEmpty
                icon={Link2OffIcon}
                title="Nenhuma nota aponta para esta."
              />
            )}
          </section>
          <Collapsible
            open={mentionsOpenFor === path}
            onOpenChange={(open) => setMentionsOpenFor(open ? path : null)}
          >
            <CollapsibleTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                />
              }
            >
              <ChevronRightIcon
                aria-hidden="true"
                className="transition-transform group-data-[panel-open]/button:rotate-90"
              />
              Menções sem link ({data.mentions.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {data.shortName ? (
                <p className="px-1 text-muted-foreground text-sm">
                  Menções não são procuradas para nomes com menos de 3
                  caracteres.
                </p>
              ) : data.mentions.length ? (
                <AppNoteList
                  items={toItems(data.mentions, onOpen, linkAction)}
                />
              ) : (
                <p className="px-1 text-muted-foreground text-sm">
                  Nenhuma menção sem link.
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </AppPanel>
  )
}
