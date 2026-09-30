#!/usr/bin/env node
import { spawn } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")
const ansi = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, "g")
const stripAnsi = (text) => text.replace(ansi, "")

function run(script) {
  return new Promise((done) => {
    /* One fixed command string: on Windows pnpm is pnpm.cmd and needs a shell. */
    const child = spawn(`pnpm ${script}`, {
      cwd: root,
      env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
      shell: true,
    })
    let output = ""
    child.stdout.on("data", (chunk) => (output += chunk))
    child.stderr.on("data", (chunk) => (output += chunk))
    child.on("close", (code) =>
      done({ script, ok: code === 0, output: stripAnsi(output) })
    )
  })
}

function summary({ script, ok, output }) {
  if (script === "test") {
    const tests = output.match(/Tests\s+(.+)/)
    return `${ok ? "passou" : "falhou"}${tests ? ` — ${tests[1].trim()}` : ""}`
  }
  if (script === "check") {
    const checked = output.match(/Checked (\d+) files/)
    return `${ok ? "passou" : "falhou"}${checked ? ` — ${checked[1]} arquivos` : ""}`
  }
  return ok ? "passou" : "falhou"
}

const results = await Promise.all(["check", "typecheck", "test"].map(run))

console.log("## Verificação automática\n")
for (const result of results)
  console.log(`- \`pnpm ${result.script}\`: ${summary(result)}`)

for (const result of results.filter((r) => !r.ok)) {
  const tail = result.output.trim().split("\n").slice(-40).join("\n")
  console.log(
    `\n### Falha em \`pnpm ${result.script}\` (últimas linhas)\n\n\`\`\`\n${tail}\n\`\`\``
  )
}

console.log(
  "\n`pnpm test:e2e` e `pnpm build` não são executados aqui. Peça-os quando o escopo tocar gravação, renomear, mover, excluir, `src-tauri/` ou o que sai no build."
)
