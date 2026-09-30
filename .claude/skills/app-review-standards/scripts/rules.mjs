#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")
const wanted = new Set(process.argv.slice(2).map((code) => code.toUpperCase()))
const standards = readFileSync(join(root, "docs/standards.md"), "utf8")

const selected = standards.split(/^(?=## )/m).filter((part) => {
  const code = part.match(/^## .*\(([A-Z]{3})\)/)
  return code ? wanted.has(code[1]) : /^## Como ler/.test(part)
})

console.log(selected.join("\n"))
