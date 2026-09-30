// Confere os links relativos dos arquivos Markdown: alvo que não existe vira
// erro antes de virar link quebrado no GitHub. Roda sem instalar dependências.
// Uso: node .github/scripts/check-markdown-links.mjs [raiz]
import { readdir, readFile, stat } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"

const root = resolve(process.argv[2] ?? ".")
const ignored = new Set([
  "node_modules",
  "dist",
  ".git",
  "test-results",
  ".tanstack",
  "playwright-report",
])

async function markdownFiles(directory) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const full = join(directory, entry.name)
    if (entry.isDirectory()) found.push(...(await markdownFiles(full)))
    else if (entry.name.endsWith(".md")) found.push(full)
  }
  return found
}

function withoutCodeBlocks(text) {
  // Link dentro de exemplo em bloco de código não é link; preserva as quebras
  // de linha para que o número informado no erro continue certo.
  let fenced = false
  return text
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced
        return ""
      }
      return fenced ? "" : line.replace(/`[^`]*`/g, "")
    })
    .join("\n")
}

function targets(text) {
  const found = []
  const patterns = [/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, /href="([^"]+)"/g]
  for (const [index, line] of text.split("\n").entries())
    for (const pattern of patterns)
      for (const match of line.matchAll(pattern))
        found.push({ target: match[1], line: index + 1 })
  return found
}

const problems = []
for (const file of await markdownFiles(root)) {
  const text = withoutCodeBlocks(await readFile(file, "utf8"))
  for (const { target, line } of targets(text)) {
    if (/^(https?:|mailto:|#|<)/.test(target)) continue
    const [path] = target.split(/[#?]/)
    if (!path) continue
    try {
      await stat(resolve(dirname(file), decodeURIComponent(path)))
    } catch {
      problems.push(`${relative(root, file)}:${line} aponta para ${path}`)
    }
  }
}

if (problems.length) {
  console.error("Links relativos quebrados:")
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}
console.log("Links relativos conferidos: todos os alvos existem.")
