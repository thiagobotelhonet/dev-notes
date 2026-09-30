// Classifica o diff de uma PR: mudança só de texto não precisa da suíte
// inteira. Em qualquer dúvida responde "code", porque deixar de rodar o
// que era necessário custa mais caro do que rodar à toa.
// Uso: node .github/scripts/detect-code-changes.mjs <base> <head>

import { execFileSync } from "node:child_process"
import { appendFileSync } from "node:fs"

const [base, head] = process.argv.slice(2)

const textOnly = [
  /\.md$/,
  /^docs\//,
  /^LICENSE$/,
  /^\.github\/ISSUE_TEMPLATE\//,
  /^\.github\/pull_request_template\.md$/,
]

function decide() {
  if (!base || !head) return { code: true, why: "sem base ou head no evento" }
  let changed
  try {
    changed = execFileSync(
      "git",
      ["diff", "--name-only", `${base}...${head}`],
      {
        encoding: "utf8",
      }
    )
      .split("\n")
      .filter(Boolean)
  } catch (error) {
    return { code: true, why: `git diff falhou: ${error.message}` }
  }
  if (!changed.length) return { code: true, why: "diff vazio" }
  const relevant = changed.filter(
    (file) => !textOnly.some((pattern) => pattern.test(file))
  )
  if (!relevant.length)
    return { code: false, why: `${changed.length} arquivo(s), só texto` }
  return { code: true, why: `muda ${relevant[0]}` }
}

const { code, why } = decide()
console.log(`code=${code} (${why})`)
if (process.env.GITHUB_OUTPUT)
  appendFileSync(process.env.GITHUB_OUTPUT, `code=${code}\n`)
