import { type EntryKind, VaultError, type VaultPath } from "./vault.types"

/** Validates and normalizes a vault path: `a//b/` becomes `a/b`. */
export function normalizeVaultPath(input: string): VaultPath {
  if (input.includes("\\") || input.includes(":") || input.startsWith("/"))
    throw new VaultError("invalid-name", input)
  const segments = input.split("/").filter((segment) => segment !== "")
  if (segments.some((segment) => segment === "." || segment === ".."))
    throw new VaultError("invalid-name", input)
  return segments.join("/")
}

export function joinVaultPath(parent: VaultPath, name: string): VaultPath {
  return parent === "" ? name : `${parent}/${name}`
}

export function parentOf(path: VaultPath): VaultPath {
  const index = path.lastIndexOf("/")
  return index === -1 ? "" : path.slice(0, index)
}

/** Last segment; notes lose the `.md` extension. */
export function basenameOf(path: VaultPath): string {
  const name = path.slice(path.lastIndexOf("/") + 1)
  return kindOf(name) === "note" ? name.slice(0, -3) : name
}

export function kindOf(path: VaultPath): Exclude<EntryKind, "folder"> {
  const lower = path.toLowerCase()
  if (lower.endsWith(".md")) return "note"
  if (lower.endsWith(".canvas")) return "canvas"
  return "other"
}

/** Fixed locale on purpose: conflicts must not change with the UI language. */
export function nameKey(name: string): string {
  return name.normalize("NFC").toLocaleLowerCase("pt-BR")
}

export function isHiddenPath(path: VaultPath): boolean {
  return path.split("/").some((segment) => segment.startsWith("."))
}

/** `folder === ""` is the vault root, which contains everything. */
export function isInside(path: VaultPath, folder: VaultPath): boolean {
  return folder === "" || path === folder || path.startsWith(`${folder}/`)
}
