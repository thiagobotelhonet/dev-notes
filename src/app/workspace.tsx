import {
  FilePlusIcon,
  FileSearchIcon,
  FileTextIcon,
  FileWarningIcon,
  FolderOpenIcon,
  FolderTreeIcon,
  FolderXIcon,
  type LucideIcon,
  MonitorXIcon,
  PanelRightIcon,
  SearchIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { BacklinksPanel } from "@/features/backlinks"
import { NoteEditor, useNoteStore } from "@/features/editor"
import { LinkChoiceDialog } from "@/features/links"
import { QuickSearchDialog, SearchPanel } from "@/features/search"
import {
  type FollowOutcome,
  type FollowRequest,
  useVaultStore,
  VaultTree,
  VaultTreeSkeleton,
} from "@/features/vault"
import { AppConfirm } from "@/shared/components/app-confirm"
import { AppEmpty } from "@/shared/components/app-empty"
import { AppShell } from "@/shared/components/app-shell"
import { Button } from "@/shared/components/ui/button"
import { Kbd } from "@/shared/components/ui/kbd"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import {
  basenameOf,
  parentOf,
  type VaultPath,
  type VaultSession,
} from "@/shared/vault"

/* Stable, so the result list does not rebuild on every workspace render. */
const openSearchResult = (path: VaultPath, offset?: number) =>
  openNoteAt(path, offset === undefined ? undefined : { offset })

function openNoteAt(
  path: VaultPath,
  place?: { heading?: string; offset?: number }
) {
  useNoteStore
    .getState()
    .open(path, place)
    .catch(() => toast.error("Não foi possível abrir a nota."))
}

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
const modifierKey = isMac ? "Cmd" : "Ctrl"
const backlinksShortcut = `${modifierKey}+Shift+B`
const quickSearchShortcut = `${modifierKey}+P`
const searchShortcut = `${modifierKey}+Shift+F`
const filesShortcut = `${modifierKey}+Shift+E`

type SidebarTab = "files" | "search"

function SidebarTabTrigger({
  value,
  label,
  icon: Icon,
  shortcut,
}: {
  value: SidebarTab
  label: string
  icon: LucideIcon
  shortcut: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<TabsTrigger value={value} />}>
        <Icon aria-hidden="true" />
        {label}
      </TooltipTrigger>
      <TooltipContent>
        {label} <Kbd>{shortcut}</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}

/** Icon button whose shortcut is visible in the tooltip (LAY-06). */
function ShortcutButton({
  label,
  shortcut,
  icon: Icon,
  onClick,
}: {
  label: string
  shortcut: string
  icon: LucideIcon
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        <Icon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>
        {label} <Kbd>{shortcut}</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}

function BacklinksToggle({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {
  return (
    <ShortcutButton
      label={visible ? "Esconder backlinks" : "Mostrar backlinks"}
      shortcut={backlinksShortcut}
      icon={PanelRightIcon}
      onClick={onToggle}
    />
  )
}

/** Turns what a link leads to into UI (contracts/ui.md "Seguir link"). */
function useFollowLink() {
  const [broken, setBroken] = useState<VaultPath | null>(null)
  const [choice, setChoice] = useState<Extract<
    FollowOutcome,
    { type: "choose" }
  > | null>(null)

  const show = (outcome: FollowOutcome) => {
    switch (outcome.type) {
      case "choose":
        setChoice(outcome)
        return
      case "open":
        openNoteAt(
          outcome.path,
          outcome.heading ? { heading: outcome.heading } : undefined
        )
        if (outcome.created) {
          const folder = parentOf(outcome.path)
          toast.success(
            `Nota “${basenameOf(outcome.path)}” criada em ${folder === "" ? "raiz" : folder}.`
          )
        }
        return
      case "invalid":
        toast.error(`Não foi possível criar a nota: ${outcome.reason}.`)
        return
      case "broken":
        setBroken(outcome.path)
        return
      case "unsupported":
        toast.info(
          outcome.kind === "canvas"
            ? "Abrir canvas ainda não está disponível."
            : "Abrir este tipo de arquivo ainda não está disponível."
        )
        return
    }
  }

  const follow = (link: FollowRequest, from: VaultPath) => {
    useVaultStore
      .getState()
      .followLink(link, from)
      .then(show)
      .catch(() => toast.error("Não foi possível seguir o link."))
  }

  const recreate = () => {
    if (!broken) return
    setBroken(null)
    useVaultStore
      .getState()
      .recreateNote(broken)
      .then(show)
      .catch(() => toast.error("Não foi possível recriar a nota."))
  }

  const choose = (path: VaultPath) => {
    setChoice(null)
    openNoteAt(path, choice?.heading ? { heading: choice.heading } : undefined)
  }

  const dialogs = (
    <>
      <AppConfirm
        open={broken !== null}
        tone="default"
        title={`“${broken ? basenameOf(broken) : ""}” foi excluída`}
        description="A nota pode ser restaurada pela lixeira do sistema, ou recriada vazia."
        confirmLabel="Recriar nota"
        onConfirm={recreate}
        onCancel={() => setBroken(null)}
      />
      <LinkChoiceDialog
        name={choice?.name ?? null}
        candidates={choice?.candidates ?? []}
        onChoose={choose}
        onCancel={() => setChoice(null)}
      />
    </>
  )
  return { follow, dialogs }
}

function CenterPane({
  backlinksVisible,
  onToggleBacklinks,
}: {
  backlinksVisible: boolean
  onToggleBacklinks: () => void
}) {
  const status = useVaultStore((state) => state.status)
  const entries = useVaultStore((state) => state.entries)
  const pick = useVaultStore((state) => state.pick)
  const createNote = useVaultStore((state) => state.createNote)
  const notePath = useNoteStore((state) => state.path)
  const noteStatus = useNoteStore((state) => state.status)
  const hadPending = useNoteStore((state) => state.hadPending)
  const recreate = useNoteStore((state) => state.recreate)
  const openNote = useNoteStore((state) => state.open)
  const { follow, dialogs } = useFollowLink()

  const chooseFolder = {
    label: "Escolher outra pasta",
    onClick: () => void pick(),
  }

  if (status === "no-desktop")
    return (
      <AppEmpty
        icon={MonitorXIcon}
        title="O Dev Notes precisa rodar como app desktop"
        description="Abra o aplicativo instalado ou rode pnpm tauri dev."
      />
    )
  if (status === "open-failed")
    return (
      <AppEmpty
        icon={FolderXIcon}
        title="Não foi possível abrir o vault"
        description="A pasta pode ter sido movida, apagada ou estar sem permissão."
        action={chooseFolder}
      />
    )
  if (status === "unavailable")
    return (
      <AppEmpty
        icon={FolderXIcon}
        title="A pasta do vault não está mais acessível"
        action={chooseFolder}
      />
    )
  if (status === "idle" || status === "picking")
    return (
      <AppEmpty
        icon={FolderOpenIcon}
        title="Escolha uma pasta para começar"
        description="Qualquer pasta do computador vira um vault. As notas continuam sendo arquivos .md."
        action={{ label: "Abrir pasta", onClick: () => void pick() }}
      />
    )
  if (status === "loading") return <div className="flex-1" />

  if (notePath && noteStatus === "missing")
    return (
      <AppEmpty
        icon={FileWarningIcon}
        title="Esta nota foi excluída fora do Dev Notes"
        action={
          hadPending
            ? {
                label: "Recriar com este conteúdo",
                onClick: () => void recreate(),
              }
            : undefined
        }
      />
    )
  if (notePath)
    return (
      <>
        <NoteEditor
          key={notePath}
          onFollowLink={follow}
          actions={
            <BacklinksToggle
              visible={backlinksVisible}
              onToggle={onToggleBacklinks}
            />
          }
        />
        {dialogs}
      </>
    )

  const newRootNote = async () => {
    try {
      await openNote(await createNote(""))
    } catch {
      toast.error("Não foi possível criar a nota.")
    }
  }
  if (!entries.some((entry) => entry.kind === "note"))
    return (
      <AppEmpty
        icon={FilePlusIcon}
        title="Nenhuma nota ainda"
        action={{ label: "Nova nota", onClick: () => void newRootNote() }}
      />
    )
  return <AppEmpty icon={FileTextIcon} title="Selecione ou crie uma nota" />
}

export function Workspace({ session }: { session?: VaultSession }) {
  const status = useVaultStore((state) => state.status)
  const vaultName = useVaultStore((state) => state.ref?.name)
  const activePath = useNoteStore((state) => state.path)
  const noteStatus = useNoteStore((state) => state.status)
  /* Open by default; the choice lasts for the session (spec 003, Assumptions). */
  const [backlinksVisible, setBacklinksVisible] = useState(true)
  const toggleBacklinks = () => setBacklinksVisible((visible) => !visible)
  const [quickSearchOpen, setQuickSearchOpen] = useState(false)
  /* The tab lasts for the session; the app opens on the tree (contracts/ui.md). */
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("files")
  const [searchFocus, setSearchFocus] = useState(0)

  useEffect(() => {
    useNoteStore.getState().close()
    void useVaultStore.getState().restore(session)
  }, [session])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const modifier = isMac ? event.metaKey : event.ctrlKey
      if (!modifier || !event.shiftKey || event.key.toLowerCase() !== "b")
        return
      event.preventDefault()
      setBacklinksVisible((visible) => !visible)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  /* Capture phase: the editor must not see them, and WebView2 would print on Ctrl+P (research R11). */
  useEffect(() => {
    const actions: Record<string, () => void> = {
      p: () => setQuickSearchOpen(true),
      "shift+f": () => {
        setSidebarTab("search")
        setSearchFocus((request) => request + 1)
      },
      "shift+e": () => setSidebarTab("files"),
    }
    const onKey = (event: KeyboardEvent) => {
      const modifier = isMac ? event.metaKey : event.ctrlKey
      const action =
        modifier &&
        actions[`${event.shiftKey ? "shift+" : ""}${event.key.toLowerCase()}`]
      if (!action) return
      event.preventDefault()
      event.stopPropagation()
      if (useVaultStore.getState().status === "ready") action()
    }
    window.addEventListener("keydown", onKey, { capture: true })
    return () => window.removeEventListener("keydown", onKey, { capture: true })
  }, [])

  const showBacklinks =
    status === "ready" &&
    activePath !== null &&
    noteStatus !== "missing" &&
    backlinksVisible

  const openNote = (path: VaultPath) => openNoteAt(path)

  return (
    <AppShell
      sidebarHeader={
        <div className="flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate px-2 py-1 font-semibold text-sm">
            {vaultName ?? "Dev Notes"}
          </p>
          {status === "ready" && (
            <ShortcutButton
              label="Abrir nota pelo nome"
              shortcut={quickSearchShortcut}
              icon={FileSearchIcon}
              onClick={() => setQuickSearchOpen(true)}
            />
          )}
        </div>
      }
      sidebar={
        status === "loading" ? (
          <VaultTreeSkeleton />
        ) : status === "ready" ? (
          <Tabs
            value={sidebarTab}
            onValueChange={(value) => setSidebarTab(value as SidebarTab)}
            className="h-full min-h-0 gap-0"
          >
            <TabsList variant="line" className="w-full shrink-0 px-2">
              <SidebarTabTrigger
                value="files"
                label="Arquivos"
                icon={FolderTreeIcon}
                shortcut={filesShortcut}
              />
              <SidebarTabTrigger
                value="search"
                label="Busca"
                icon={SearchIcon}
                shortcut={searchShortcut}
              />
            </TabsList>
            {/* Kept mounted: the typed search and the tree state survive switching tabs. */}
            <TabsContent value="files" keepMounted className="min-h-0 pt-2">
              <VaultTree activePath={activePath} onOpenNote={openNote} />
            </TabsContent>
            <TabsContent value="search" keepMounted className="min-h-0">
              <SearchPanel
                onOpen={openSearchResult}
                focusRequest={searchFocus}
              />
            </TabsContent>
          </Tabs>
        ) : null
      }
      aside={
        showBacklinks && activePath ? (
          <BacklinksPanel
            path={activePath}
            onOpen={(path, offset) => openNoteAt(path, { offset })}
            onClose={() => setBacklinksVisible(false)}
          />
        ) : undefined
      }
    >
      <CenterPane
        backlinksVisible={backlinksVisible}
        onToggleBacklinks={toggleBacklinks}
      />
      <QuickSearchDialog
        open={quickSearchOpen}
        onOpenChange={setQuickSearchOpen}
        onOpen={openNote}
      />
    </AppShell>
  )
}
