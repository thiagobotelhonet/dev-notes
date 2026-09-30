export { LinkChoiceDialog } from "./components/link-choice-dialog"
export {
  type DeletedNotes,
  parseDeletedNotes,
  serializeDeletedNotes,
  withDeleted,
  withoutExisting,
} from "./model/links.deleted"
export { type EmbedState, embedState } from "./model/links.embeds"
export { createLinkIndex, type LinkIndex } from "./model/links.index"
export { type LinkOccurrence, parseLinks } from "./model/links.parser"
export {
  affectedByMoves,
  type ChangePlan,
  type EntryMove,
  fileMoves,
  planChange,
} from "./model/links.rename"
export { findSection, type Section } from "./model/links.sections"
export { suggestLinks } from "./model/links.suggest"
export {
  type LinkState,
  type LinkTarget,
  resolveLinkTarget,
} from "./model/links.target"
