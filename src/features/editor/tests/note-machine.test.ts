import { describe, expect, it } from "vitest"
import {
  hasPendingEdit,
  type NoteEvent,
  type NoteMachineState,
  transition,
} from "../model/note.machine"

const external: NoteEvent = { type: "external" }
const run = (
  status: NoteMachineState["status"],
  events: NoteEvent[],
  hadPending = false
) =>
  events.reduce<NoteMachineState>((state, event) => transition(state, event), {
    status,
    hadPending,
  })

describe("máquina de estados da nota aberta", () => {
  it("clean → dirty → saving → clean", () => {
    expect(
      run("clean", [
        { type: "edit" },
        { type: "saveStarted" },
        { type: "saveDone" },
      ]).status
    ).toBe("clean")
  })

  it("editar durante a gravação volta para dirty, e o saveDone não limpa", () => {
    expect(
      run("dirty", [
        { type: "saveStarted" },
        { type: "edit" },
        { type: "saveDone" },
      ]).status
    ).toBe("dirty")
  })

  it("saving → conflict com alteração externa e → missing com remoção", () => {
    expect(
      transition({ status: "saving", hadPending: false }, external).status
    ).toBe("conflict")
    expect(
      transition(
        { status: "saving", hadPending: false },
        { type: "externalRemoved" }
      )
    ).toMatchObject({ status: "missing", hadPending: true })
  })

  it("clean + alteração externa recarrega o buffer", () => {
    expect(
      transition({ status: "clean", hadPending: false }, external)
    ).toEqual({
      status: "clean",
      hadPending: false,
      reload: true,
    })
  })

  it("dirty + alteração externa vai para conflict", () => {
    expect(
      transition({ status: "dirty", hadPending: false }, external).status
    ).toBe("conflict")
  })

  it("conflict → saving (manter minha versão) e → clean (usar a do arquivo)", () => {
    expect(
      transition(
        { status: "conflict", hadPending: false },
        { type: "keepMine" }
      ).status
    ).toBe("saving")
    expect(
      transition(
        { status: "conflict", hadPending: false },
        { type: "keepExternal" }
      )
    ).toMatchObject({ status: "clean", reload: true })
  })

  it("clean/dirty → missing e missing → saving ao recriar", () => {
    expect(
      transition(
        { status: "clean", hadPending: false },
        { type: "externalRemoved" }
      )
    ).toMatchObject({ status: "missing", hadPending: false })
    expect(
      transition(
        { status: "dirty", hadPending: false },
        { type: "externalRemoved" }
      )
    ).toMatchObject({ status: "missing", hadPending: true })
    expect(
      transition({ status: "missing", hadPending: true }, { type: "recreate" })
        .status
    ).toBe("saving")
  })

  it("conflict + nova alteração externa continua em conflict; + remoção vai para missing com pendência", () => {
    expect(
      transition({ status: "conflict", hadPending: false }, external).status
    ).toBe("conflict")
    expect(
      transition(
        { status: "conflict", hadPending: false },
        { type: "externalRemoved" }
      )
    ).toMatchObject({ status: "missing", hadPending: true })
  })

  it("arquivo que reaparece: sem pendência recarrega; com pendência vira conflito", () => {
    expect(
      transition({ status: "missing", hadPending: false }, external)
    ).toMatchObject({
      status: "clean",
      reload: true,
    })
    expect(
      transition({ status: "missing", hadPending: true }, external).status
    ).toBe("conflict")
  })

  it("edição pendente = dirty, saving, conflict ou missing com pendência", () => {
    expect(hasPendingEdit({ status: "clean", hadPending: false })).toBe(false)
    expect(hasPendingEdit({ status: "dirty", hadPending: false })).toBe(true)
    expect(hasPendingEdit({ status: "saving", hadPending: false })).toBe(true)
    expect(hasPendingEdit({ status: "conflict", hadPending: false })).toBe(true)
    expect(hasPendingEdit({ status: "missing", hadPending: false })).toBe(false)
    expect(hasPendingEdit({ status: "missing", hadPending: true })).toBe(true)
  })
})
