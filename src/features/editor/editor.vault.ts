import type { EditorView } from "@codemirror/view"
import { resolveLinkTarget } from "@/features/links"
import {
  type FollowRequest,
  onEntryEvent,
  useVaultStore,
  type VaultEvent,
} from "@/features/vault"
import { isInside, type VaultPath } from "@/shared/vault"
import { linkContextChanged } from "./model/editor.links"

/** Same rule for highlight, follow and embeds (contracts/links-module.md). */
export function resolveInVault(link: FollowRequest, from: VaultPath) {
  const { linkIndex, entries, deleted } = useVaultStore.getState()
  if (!linkIndex) return null
  return resolveLinkTarget({ link, from, index: linkIndex, entries, deleted })
}

/** The link index changes in place, so notes and the deleted registry are watched instead (research R9). */
export function watchLinkContext(view: EditorView) {
  return useVaultStore.subscribe((state, previous) => {
    if (
      state.entries !== previous.entries ||
      state.deleted !== previous.deleted ||
      state.linkIndex !== previous.linkIndex
    )
      view.dispatch({ effects: linkContextChanged.of(null) })
  })
}

export function readNote(path: VaultPath) {
  const { vault } = useVaultStore.getState()
  if (!vault) return Promise.reject(new Error("No open vault"))
  return vault.storage.readText(path)
}

function touches(event: VaultEvent, path: VaultPath) {
  switch (event.kind) {
    case "moved":
      return event.from === path || event.to === path
    case "external":
      return isInside(path, event.change.path)
    default:
      return event.path === path
  }
}

export function onNoteChanged(path: VaultPath, listener: () => void) {
  return onEntryEvent((event) => {
    if (touches(event, path)) listener()
  })
}

export type FollowLinkHandler = (link: FollowRequest, from: VaultPath) => void
