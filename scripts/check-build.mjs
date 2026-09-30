import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

const directory = process.argv[2] ?? "dist"

/* The memory adapter, its test hook and the demo vault stay out (AMB-03). */
const mockMarkers = [
  /createMemoryVaultSession/,
  /__devnotesMock/,
  /memory-vault/,
  /Passo a passo do deploy\./,
  /Util do frontend/,
]

/* Network loads break offline use; case-sensitive: CSS `url(` loads, `new URL(` does not. */
const networkLoad =
  /(?:\bsrc=|\bhref=|\burl\(|@import|\bfetch\(|\bimport\()\s*["'`]?https?:\/\//

/* Sites that may be linked (href=) but never loaded. */
const allowedUrls = [
  "http://www.w3.org/",
  "https://www.w3.org/",
  "https://github.com/",
  "https://reactjs.org/",
  "https://react.dev/",
  "https://jsoncanvas.org/",
]

const entries = await readdir(directory, { recursive: true })
const problems = []
for (const entry of entries) {
  if (!/\.(js|html|css)$/.test(entry)) continue
  const content = await readFile(join(directory, entry), "utf8")
  for (const marker of mockMarkers)
    if (marker.test(content))
      problems.push(`${entry}: mock code in the build (${marker.source})`)
  for (const match of content.matchAll(new RegExp(networkLoad, "g"))) {
    const url = content
      .slice(match.index + match[0].search(/https?:/i))
      .match(/^https?:\/\/[^\s"'`)]+/)?.[0]
    const onlyLinked = match[0].startsWith("href=")
    if (
      url &&
      !url.includes("${") &&
      !(onlyLinked && allowedUrls.some((allowed) => url.startsWith(allowed)))
    )
      problems.push(`${entry}: loads from the network: ${url}`)
  }
}
if (problems.length) {
  for (const problem of problems) console.error(problem)
  throw new Error("Build rejected: mock code or network loads in dist/.")
}
console.log("Build checked: no mock code and no network loads.")
