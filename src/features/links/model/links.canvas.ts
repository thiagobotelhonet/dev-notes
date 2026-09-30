import type { VaultPath } from "@/shared/vault"
import { canvasSchema } from "../types/links.schemas"

type Rewrite =
  | { changed: boolean; json: string }
  | { error: "invalid-json" | "not-a-canvas" }

/** Indentation of the original file, so a rewrite keeps its layout. */
function indentOf(json: string): string | undefined {
  if (!json.includes("\n")) return undefined
  return json.match(/\n([ \t]+)\S/)?.[1] ?? "  "
}

/** Changes only `file` of file nodes; everything else in the JSON stays (FR-012). */
export function rewriteCanvasFileRefs(
  json: string,
  renames: Map<VaultPath, VaultPath>
): Rewrite {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { error: "invalid-json" }
  }
  if (!canvasSchema.safeParse(raw).success) return { error: "not-a-canvas" }
  const nodes = (raw as { nodes?: Record<string, unknown>[] }).nodes ?? []
  let changed = false
  for (const node of nodes) {
    const target =
      node.type === "file" && typeof node.file === "string"
        ? renames.get(node.file)
        : undefined
    if (target !== undefined) {
      node.file = target
      changed = true
    }
  }
  if (!changed) return { changed: false, json }
  const trailing = json.endsWith("\n") ? "\n" : ""
  return {
    changed: true,
    json: JSON.stringify(raw, null, indentOf(json)) + trailing,
  }
}
