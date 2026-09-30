export type NoteStatus = "clean" | "dirty" | "saving" | "conflict" | "missing"

export interface NoteMachineState {
  status: NoteStatus
  /** Only meaningful in `missing`: was there an unsaved edit when it vanished. */
  hadPending: boolean
}

export type NoteEvent =
  | { type: "edit" }
  | { type: "saveStarted" }
  | { type: "saveDone" }
  | { type: "external" }
  | { type: "externalRemoved" }
  | { type: "keepMine" }
  | { type: "keepExternal" }
  | { type: "recreate" }

export interface NoteTransition extends NoteMachineState {
  /** The buffer must be replaced by the file content. */
  reload: boolean
}

const to = (
  status: NoteStatus,
  hadPending = false,
  reload = false
): NoteTransition => ({ status, hadPending, reload })

export function hasPendingEdit(state: NoteMachineState) {
  return (
    state.status === "dirty" ||
    state.status === "saving" ||
    state.status === "conflict" ||
    (state.status === "missing" && state.hadPending)
  )
}

/** State machine of the open note (data-model "OpenNote"). */
export function transition(
  state: NoteMachineState,
  event: NoteEvent
): NoteTransition {
  const same = to(state.status, state.hadPending)
  switch (state.status) {
    case "clean":
      if (event.type === "edit") return to("dirty")
      if (event.type === "external") return to("clean", false, true)
      if (event.type === "externalRemoved") return to("missing", false)
      return same
    case "dirty":
      if (event.type === "saveStarted") return to("saving")
      if (event.type === "external") return to("conflict")
      if (event.type === "externalRemoved") return to("missing", true)
      return same
    case "saving":
      if (event.type === "edit") return to("dirty")
      if (event.type === "saveDone") return to("clean")
      if (event.type === "external") return to("conflict")
      if (event.type === "externalRemoved") return to("missing", true)
      return same
    case "conflict":
      if (event.type === "keepMine") return to("saving")
      if (event.type === "keepExternal") return to("clean", false, true)
      if (event.type === "externalRemoved") return to("missing", true)
      return same
    case "missing":
      if (event.type === "recreate") return to("saving")
      if (event.type === "external")
        return state.hadPending ? to("conflict") : to("clean", false, true)
      return same
  }
}
