#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")
const args = process.argv.slice(2)
const MAX_PER_RULE = 20

const git = (...gitArgs) =>
  execFileSync("git", ["-c", "core.quotepath=false", ...gitArgs], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  })

const OUT_OF_SCOPE = [
  /^src-tauri\/(target|gen)\//,
  /^pnpm-lock\.yaml$/,
  /^dist\//,
  /^test-results\//,
  /^playwright-report\//,
  /(^|\/)node_modules\//,
]
const TEXT_FILE =
  /\.(ts|tsx|js|mjs|cjs|json|md|css|ya?ml|html|toml|txt)$|(^|\/)\.(env[^/]*|gitignore|npmrc|node-version)$/
const isUi = (path) => path.startsWith("src/shared/components/ui/")
const isCode = (path) =>
  /^(src|e2e|scripts)\/.*\.(ts|tsx|mjs)$/.test(path) && !isUi(path)
const isTest = (path) => /\.(test|spec)\.(ts|tsx|mjs)$/.test(path)

function scopeFromStatus() {
  return git("status", "--porcelain=v1", "-uall")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2)
      const path = line.slice(3).split(" -> ").pop().replace(/^"|"$/g, "")
      const status =
        code === "??" || code.includes("A")
          ? "novo"
          : code.includes("D")
            ? "apagado"
            : code.includes("R")
              ? "renomeado"
              : "alterado"
      return { path, status }
    })
}

function scopeFromRange(range) {
  const names = {
    A: "novo",
    D: "apagado",
    M: "alterado",
    R: "renomeado",
    C: "novo",
    T: "alterado",
  }
  return git("diff", "--name-status", "-M", range)
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t")
      return { path: parts.at(-1), status: names[parts[0][0]] ?? "alterado" }
    })
}

function scopeFromPaths(paths) {
  return git(
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    ...paths
  )
    .split("\n")
    .filter(Boolean)
    .map((path) => ({ path, status: "sem mudança" }))
}

const rawScope =
  args.length === 0
    ? scopeFromStatus()
    : args.some((a) => a.includes(".."))
      ? scopeFromRange(args.find((a) => a.includes("..")))
      : scopeFromPaths(args)

const scope = rawScope
  .filter((file) => !OUT_OF_SCOPE.some((pattern) => pattern.test(file.path)))
  .filter((file) => !(isUi(file.path) && file.status === "sem mudança"))
  .map((file) => {
    const full = join(root, file.path)
    const readable =
      file.status !== "apagado" &&
      TEXT_FILE.test(file.path) &&
      existsSync(full) &&
      statSync(full).isFile()
    return { ...file, content: readable ? readFileSync(full, "utf8") : null }
  })

const sections = new Set(["NOM", "COD", "IDI"])
for (const { path, content = "", status } of scope) {
  if (isUi(path)) continue
  const text = isCode(path) ? (content ?? "") : ""
  if (path.endsWith(".tsx"))
    for (const s of ["CMP", "COR", "LAY"]) sections.add(s)
  if (path === "src/styles.css") sections.add("COR")
  if (/useState|createContext|useContext|zustand/.test(text))
    sections.add("EST")
  if (/useForm|form\.Field|@tanstack\/react-form["']/.test(text))
    sections.add("FRM")
  if (/toLocale|Intl\.|@\/shared\/lib\/format/.test(text)) sections.add("FMT")
  if (
    /^\.env|^vite\.config|^src\/mocks\/|^src\/main\.tsx$|^src\/shared\/vault\/index\.ts$|^public\/|^scripts\/check-build/.test(
      path
    ) ||
    /import\.meta\.env/.test(text)
  )
    sections.add("AMB")
  if (
    /^(package\.json|tsconfig\.json|components\.json|biome\.json|pnpm-workspace\.yaml|\.npmrc|\.node-version)$/.test(
      path
    )
  )
    sections.add("FER")
  if (
    isTest(path) ||
    (status !== "apagado" &&
      /^src\/features\/[^/]+\/(model|types|components)\//.test(path)) ||
    path.startsWith("e2e/")
  )
    sections.add("TST")
}

const suspects = []
const suspect = (rule, path, line, detail) =>
  suspects.push({ rule, path, line, detail })
const lines = (text) => text.split("\n")

function scanLines(rule, files, pattern, describe = (l) => l.trim()) {
  for (const { path, content } of files) {
    lines(content).forEach((line, index) => {
      if (pattern.test(line)) suspect(rule, path, index + 1, describe(line))
    })
  }
}

const live = scope.filter((f) => f.content !== null)
const code = live.filter((f) => isCode(f.path))
const appCode = code.filter((f) => !isTest(f.path))
const tsx = code.filter((f) => f.path.endsWith(".tsx"))

for (const { path } of scope.filter(
  (f) => f.status !== "apagado" && f.path.startsWith("src/") && !isUi(f.path)
)) {
  const name = basename(path).replace(/\.[^.]+$/, "")
  if (
    !/^(README|CLAUDE|SKILL)$/.test(name) &&
    !/^[a-z0-9]+([.-][a-z0-9]+)*$/.test(name)
  )
    suspect("NOM-01", path, 0, "nome fora de minúsculas com hífen")
}
for (const { path } of scope.filter((f) => f.status !== "apagado")) {
  const match = path.match(/^src\/features\/([^/]+)\/(model|types)\/([^/]+)$/)
  if (match && !match[3].startsWith(`${match[1]}.`))
    suspect(
      "NOM-04",
      path,
      0,
      `arquivo de ${match[2]}/ não começa com "${match[1]}."`
    )
  const atRoot = path.match(/^src\/features\/([^/]+)\/([^/]+)$/)
  if (
    atRoot &&
    !["index.ts", "README.md"].includes(atRoot[2]) &&
    !/^[a-z-]+\.store\.ts$/.test(atRoot[2])
  )
    suspect("NOM-05", path, 0, "arquivo solto na raiz do módulo")
}
scanLines("NOM-02", code, /export\s+default\b/)
scanLines(
  "COD-05",
  code,
  /import\s+\*\s+as\s+React\b/,
  (l) => `${l.trim()} (fora de ui/, React vem por nome)`
)
scanLines("COD-01/COD-02", code, /^\s*(\/\/(?!\/)|\/\*|\{\s*\/\*)/)
for (const { path, status } of scope)
  if (isUi(path) && status === "alterado")
    suspect("CMP-01", path, 0, "arquivo gerado pelo shadcn foi alterado")
const PRIMITIVE_TAGS = {
  select: ["select"],
  input: ["input"],
  textarea: ["textarea"],
  button: ["button"],
  label: ["label"],
  separator: ["hr"],
  table: ["table", "thead", "tbody", "tfoot", "tr", "td", "th"],
}
const uiDir = join(root, "src/shared/components/ui")
const nativeWithPrimitive = (
  existsSync(uiDir) ? readdirSync(uiDir) : []
).flatMap((file) => PRIMITIVE_TAGS[file.replace(/\.tsx$/, "")] ?? [])
if (nativeWithPrimitive.length)
  scanLines(
    "CMP-02",
    tsx,
    new RegExp(`<(${nativeWithPrimitive.join("|")})[\\s/>]`),
    (l) => `${l.trim()} (elemento nativo com primitiva em ui/)`
  )
scanLines("CMP-03", code, /\basChild\b/)
scanLines(
  "CMP-09",
  code.filter((f) => f.path !== "src/app/root.tsx"),
  /<Toaster\b/
)
scanLines(
  "LAY-05",
  tsx,
  /onMouseMove|onPointerMove|onDrag(Start)?\b/,
  (l) => `${l.trim()} (arraste à mão; redimensionar só com Resizable)`
)
scanLines(
  "III",
  code.filter((f) => !f.path.startsWith("src/shared/vault/adapters/tauri/")),
  /from\s+["']@tauri-apps\/|invoke\(/,
  (l) =>
    `${l.trim()} (acesso ao sistema fora de shared/vault; constituição, princípio III)`
)
scanLines(
  "COR-01",
  tsx,
  /(["'`\s])#[0-9a-fA-F]{3,8}\b|\b(bg|text|border|ring|fill|stroke|from|via|to|outline|divide|shadow|accent|caret|decoration)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/
)
scanLines("COR-03", tsx, /\b[a-z-]+-\[[^\]]*\d[^\]]*\]/)

const styles = live.find((f) => f.path === "src/styles.css")
if (styles) {
  const block = (selector) =>
    styles.content.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? ""
  const colorVars = (css) =>
    [...css.matchAll(/--([a-z0-9-]+)\s*:\s*(oklch|#|hsl|rgb)/g)].map(
      (m) => m[1]
    )
  const rootVars = colorVars(block(":root"))
  const darkVars = new Set(colorVars(block("\\.dark")))
  const theme = block("@theme inline")
  for (const name of rootVars) {
    if (!darkVars.has(name))
      suspect(
        "COR-02",
        styles.path,
        0,
        `--${name} está em :root mas não em .dark`
      )
    if (!theme.includes(`--color-${name}:`))
      suspect(
        "COR-02",
        styles.path,
        0,
        `--${name} sem registro --color-${name} em @theme inline`
      )
  }
}

scanLines(
  "FMT-01",
  code.filter((f) => f.path !== "src/shared/lib/format.ts"),
  /toLocale(Date|Time)?String|Intl\.(NumberFormat|DateTimeFormat)/
)
scanLines("AMB-01", live, /VITE_\w*(KEY|SECRET|TOKEN|PASSWORD|PASS)\w*/)
scanLines(
  "AMB-03",
  appCode.filter((f) => !f.path.startsWith("src/mocks/")),
  /from\s+["'](@\/mocks|\.{1,2}\/mocks)/
)
for (const lock of ["package-lock.json", "yarn.lock"])
  if (existsSync(join(root, lock)))
    suspect("FER-01", lock, 0, "arquivo de trava de outro gerenciador")

const repoFiles = git("ls-files", "--cached", "--others", "--exclude-standard")
  .split("\n")
  .filter(Boolean)
for (const { path } of scope.filter(
  (f) => isTest(f.path) && f.status !== "apagado"
)) {
  if (path.startsWith("src/features/") && !path.includes("/tests/"))
    suspect("TST-02", path, 0, "teste de módulo fora de tests/")
  const tested = basename(path).replace(/\.(test|spec)(\.tsx?|\.mjs)$/, "")
  if (
    path.startsWith("src/") &&
    !tested.endsWith("-flow") &&
    !repoFiles.some(
      (f) =>
        !/\.(test|spec)\./.test(f) &&
        basename(f).replace(/\.(tsx?|mjs)$/, "") === tested
    )
  )
    suspect("TST-02", path, 0, `nenhum arquivo "${tested}" para o teste`)
}
scanLines(
  "TST-04",
  code.filter((f) => isTest(f.path)),
  /\bfireEvent\b/
)
scanLines(
  "TST-05",
  code.filter((f) => isTest(f.path)),
  /\bcleanup\(|afterEach\(\s*cleanup/
)

const deletedReferences = []
for (const { path } of scope.filter((f) => f.status === "apagado")) {
  const name = basename(path).replace(/\.[^.]+$/, "")
  let hits = ""
  try {
    hits = git(
      "grep",
      "-n",
      "-I",
      "--untracked",
      "-F",
      name,
      "--",
      "src",
      "docs",
      "e2e",
      "README.md",
      "CLAUDE.md",
      ".claude"
    )
  } catch {}
  for (const hit of hits.split("\n").filter(Boolean).slice(0, 5))
    deletedReferences.push(`\`${path}\` citado em ${hit.slice(0, 160)}`)
}

const docFiles = repoFiles.filter((f) => f.endsWith(".md"))
const standards = readFileSync(join(root, "docs/standards.md"), "utf8")
const RETIRED_RULES = new Set([
  "EST-01",
  "EST-04",
  "CMP-05",
  "CMP-06",
  "IDI-03",
  "TST-06",
  "AMB-04",
  "FER-03",
])
const ruleCodes = new Set(
  [...standards.matchAll(/^### ([A-Z]{3}-\d{2})\b/gm)].map((m) => m[1])
)
const docProblems = []
for (const doc of docFiles) {
  const text = readFileSync(join(root, doc), "utf8").replace(
    /```[\s\S]*?```/g,
    ""
  )
  for (const [, token] of text.matchAll(/`([^`\s]+)`/g)) {
    const path = token.replace(/[:,.;)]+$/, "").replace(/:\d+$/, "")
    if (!/^(src|docs|public|e2e|scripts|\.claude|\.github)\//.test(path))
      continue
    if (/[<>*{}$]|\.\.\./.test(path)) continue
    if (
      !existsSync(join(root, path)) &&
      !existsSync(join(root, dirname(doc), path))
    )
      docProblems.push(`${doc}: caminho \`${path}\` não existe`)
  }
  for (const [, link] of text.matchAll(/\]\(([^)#\s]+)\)/g)) {
    if (/^https?:/.test(link)) continue
    if (!existsSync(join(root, dirname(doc), link)))
      docProblems.push(`${doc}: link \`${link}\` não existe`)
  }
  for (const [ruleCode] of text.matchAll(
    /\b(NOM|COD|IDI|CMP|COR|LAY|EST|FRM|FMT|AMB|FER|TST)-\d{2}\b/g
  )) {
    if (!ruleCodes.has(ruleCode) && !RETIRED_RULES.has(ruleCode))
      docProblems.push(
        `${doc}: regra \`${ruleCode}\` não existe em docs/standards.md`
      )
  }
}
const allDocs = docFiles
  .map((doc) => readFileSync(join(root, doc), "utf8"))
  .join("\n")
for (const file of readdirSync(join(root, "src/shared/components")).filter(
  (f) => /^app-.+\.tsx$/.test(f) && !/\.(test|spec)\./.test(f)
)) {
  if (!allDocs.includes(file))
    docProblems.push(
      `componente padrão \`${file}\` não aparece na documentação`
    )
}
const architecture = readFileSync(join(root, "docs/arquitetura.md"), "utf8")
for (const base of ["src", "src/shared", "src/shared/components"]) {
  for (const entry of readdirSync(join(root, base), {
    withFileTypes: true,
  }).filter((e) => e.isDirectory())) {
    if (!architecture.includes(`${entry.name}/`))
      docProblems.push(
        `docs/arquitetura.md: pasta \`${base}/${entry.name}/\` não aparece no mapa`
      )
  }
}
for (const module of readdirSync(join(root, "src/features"), {
  withFileTypes: true,
}).filter((e) => e.isDirectory())) {
  if (!existsSync(join(root, "src/features", module.name, "README.md")))
    docProblems.push(`módulo \`src/features/${module.name}/\` sem README.md`)
}

const out = []
out.push(
  `## Escopo (${scope.length} arquivos${args.length ? `, argumento: ${args.join(" ")}` : ", não commitados"})\n`
)
out.push(
  scope.length
    ? scope.map((f) => `- ${f.status}: \`${f.path}\``).join("\n")
    : "- nenhum arquivo"
)

out.push(`\n## Suspeitas por busca (confirme cada uma)\n`)
if (!suspects.length) out.push("- nenhuma")
const byRule = Object.groupBy(suspects, (s) => s.rule)
for (const [rule, items] of Object.entries(byRule)) {
  out.push(`### ${rule}`)
  for (const s of items.slice(0, MAX_PER_RULE))
    out.push(
      `- \`${s.path}${s.line ? `:${s.line}` : ""}\` — ${s.detail.slice(0, 160)}`
    )
  if (items.length > MAX_PER_RULE)
    out.push(`- (+${items.length - MAX_PER_RULE} ocorrências)`)
}

out.push(`\n## Referências a arquivos apagados\n`)
out.push(
  deletedReferences.length
    ? deletedReferences.map((r) => `- ${r}`).join("\n")
    : "- nenhuma"
)

out.push(`\n## Documentação com referência quebrada ou incompleta\n`)
out.push(
  docProblems.length
    ? [...new Set(docProblems)].map((p) => `- ${p}`).join("\n")
    : "- nenhuma"
)

const rulesScript = join(dirname(fileURLToPath(import.meta.url)), "rules.mjs")
out.push(`\n## Regras que o escopo toca\n`)
out.push(
  `Seções de docs/standards.md: ${[...sections].join(", ")}. Leia com:\n`
)
out.push(`\`\`\`bash\nnode ${rulesScript} ${[...sections].join(" ")}\n\`\`\``)

console.log(out.join("\n"))
