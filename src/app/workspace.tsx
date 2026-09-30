import {
  FilePlusIcon,
  FileTextIcon,
  FileWarningIcon,
  FolderOpenIcon,
  FolderXIcon,
  MonitorXIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { NoteEditor, useNoteStore } from "@/features/editor"
import { LinkChoiceDialog } from "@/features/links"
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
import {
  basenameOf,
  parentOf,
  type VaultPath,
  type VaultSession,
} from "@/shared/vault"

function openNoteAt(path: VaultPath, heading?: string) {
  useNoteStore
    .getState()
    .open(path, heading ? { heading } : undefined)
    .catch(() => toast.error("Não foi possível abrir a nota."))
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
        openNoteAt(outcome.path, outcome.heading)
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
    openNoteAt(path, choice?.heading)
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

function CenterPane() {
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
        <NoteEditor key={notePath} onFollowLink={follow} />
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

  useEffect(() => {
    useNoteStore.getState().close()
    void useVaultStore.getState().restore(session)
  }, [session])

  const openNote = (path: VaultPath) => openNoteAt(path)

  return (
    <AppShell
      sidebarHeader={
        <p className="truncate px-2 py-1 font-semibold text-sm">
          {vaultName ?? "Dev Notes"}
        </p>
      }
      sidebar={
        status === "loading" ? (
          <VaultTreeSkeleton />
        ) : status === "ready" ? (
          <VaultTree activePath={activePath} onOpenNote={openNote} />
        ) : null
      }
    >
      <CenterPane />
    </AppShell>
  )
}
