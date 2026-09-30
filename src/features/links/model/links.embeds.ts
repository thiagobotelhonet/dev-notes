import type { VaultPath } from "@/shared/vault"
import { findSection } from "./links.sections"
import type { LinkTarget } from "./links.target"

/** Deeper embeds show only the `![[...]]` text (spec, Assumptions). */
export const maxEmbedDepth = 5

/** What an embed block shows (data-model "EmbedNode"). */
export type EmbedState =
  | { kind: "loading" }
  | { kind: "content"; text: string }
  | { kind: "empty" }
  | { kind: "not-found" }
  | { kind: "section-not-found"; heading: string }
  | { kind: "circular" }
  | { kind: "ambiguous"; candidates: VaultPath[] }
  | { kind: "unsupported" }
  | { kind: "too-deep" }

/** `chain` holds the notes above the block, down to the one where `![[...]]` is written. */
export function embedState({
  target,
  chain,
  depth,
  text,
}: {
  target: LinkTarget
  chain: VaultPath[]
  depth: number
  text?: string
}): EmbedState {
  if (depth > maxEmbedDepth) return { kind: "too-deep" }
  switch (target.state) {
    case "pending":
    case "broken":
      return { kind: "not-found" }
    case "file":
      return { kind: "unsupported" }
    case "ambiguous":
      return { kind: "ambiguous", candidates: target.candidates }
  }
  if (chain.includes(target.path)) return { kind: "circular" }
  if (text === undefined) return { kind: "loading" }
  let shown = text
  if (target.heading) {
    const section = findSection(text, target.heading)
    if (!section) return { kind: "section-not-found", heading: target.heading }
    shown = text.slice(section.from, section.to)
  }
  return shown.trim() === ""
    ? { kind: "empty" }
    : { kind: "content", text: shown }
}
