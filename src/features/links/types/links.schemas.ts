import { z } from "zod"

/** JSON Canvas 1.0 (https://jsoncanvas.org/spec/1.0/); unknown fields pass. */
const canvasNodeSchema = z.looseObject({
  id: z.string(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  color: z.string().optional(),
  file: z.string().optional(),
  subpath: z.string().optional(),
})

export const canvasSchema = z.looseObject({
  nodes: z.array(canvasNodeSchema).default([]),
  edges: z.array(z.looseObject({ id: z.string() })).default([]),
})

export type CanvasDocument = z.infer<typeof canvasSchema>

/** `.devnotes/deleted-notes.json` (data-model "DeletedNotesRegistry", ADR-009). */
export const deletedNotesSchema = z.object({
  version: z.literal(1),
  notes: z.array(
    z.object({
      path: z.string().regex(/\.md$/i),
      deletedAt: z.iso.datetime(),
    })
  ),
})
