#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, extname, join, relative, resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const errors = []
const warnings = []

const requiredPaths = [
  "README.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "GOVERNANCE.md",
  "SECURITY.md",
  "knowledge/claims.yaml",
  "knowledge/facts/project-setup.md",
  "strategy/project-map.md",
  "strategy/roadmap.md",
  "agents/system-architect.md",
  "agents/brand-strategist.md",
  "agents/visual-designer.md",
  "agents/operations-manager.md",
  "agents/financial-analyst.md",
  "agents/product-developer.md",
  "agents/handoff-protocol.md",
  "decisions/README.md",
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
]

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", ".next", "node_modules", "archive"].includes(entry.name)) return []
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

function fail(message) {
  errors.push(message)
}

for (const path of requiredPaths) {
  if (!existsSync(join(root, path))) fail(`Отсутствует обязательный путь: ${path}`)
}

const files = walk(root)
const markdownFiles = files.filter((file) => extname(file) === ".md")
const jsonFiles = files.filter((file) => extname(file) === ".json")

// Validate JSON syntax.
for (const file of jsonFiles) {
  try {
    JSON.parse(readFileSync(file, "utf8"))
  } catch (error) {
    fail(`${relative(root, file)}: некорректный JSON (${error.message})`)
  }
}

// Validate front matter for working artifacts, especially approved documents.
const artifactRoots = [
  "agents/",
  "brand/",
  "design/",
  "operations/",
  "finance/",
  "product/",
  "strategy/",
  "knowledge/facts/",
  "decisions/",
  "backlog/",
  "examples/",
]
const exemptNames = new Set(["README.md"])
const allowedStatuses = new Set([
  "draft",
  "review",
  "approved",
  "proposed",
  "accepted",
  "rejected",
  "superseded",
  "archived",
])

for (const file of markdownFiles) {
  const rel = relative(root, file).replaceAll("\\", "/")
  if (!artifactRoots.some((prefix) => rel.startsWith(prefix)) || exemptNames.has(file.split(/[\\/]/).at(-1))) continue

  const content = readFileSync(file, "utf8")
  const match = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) {
    fail(`${rel}: отсутствует YAML front matter`)
    continue
  }
  const fm = match[1]
  const field = (name) => fm.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1]?.trim()
  const status = field("status")
  if (!status || !allowedStatuses.has(status)) fail(`${rel}: некорректный status`)
  if (!field("title")) fail(`${rel}: отсутствует title`)
  if (!field("owner")) fail(`${rel}: отсутствует owner`)
  if (!field("updated") || !/^\d{4}-\d{2}-\d{2}$/.test(field("updated"))) fail(`${rel}: updated должен быть YYYY-MM-DD`)
  if (!/^sources:\s*\n\s+-\s+.+/m.test(fm)) fail(`${rel}: sources должен содержать минимум один источник`)
}

// Validate internal Markdown links.
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g
for (const file of markdownFiles) {
  const content = readFileSync(file, "utf8")
  for (const match of content.matchAll(linkPattern)) {
    const target = match[1].trim()
    if (!target || target.startsWith("#") || /^(https?:|mailto:)/.test(target)) continue
    const withoutAnchor = decodeURIComponent(target.split("#")[0])
    if (!withoutAnchor) continue
    const absolute = resolve(dirname(file), withoutAnchor)
    if (!existsSync(absolute)) fail(`${relative(root, file)}: битая ссылка ${target}`)
  }
}

// Purpose-built claims validation without accepting unknown trust states.
const claimsPath = join(root, "knowledge/claims.yaml")
if (existsSync(claimsPath)) {
  const content = readFileSync(claimsPath, "utf8")
  const blocks = content.split(/\n(?=\s{2}- id: C-\d+)/).filter((part) => /- id: C-\d+/.test(part))
  const ids = []
  for (const block of blocks) {
    const id = block.match(/- id:\s*(C-\d+)/)?.[1]
    const status = block.match(/\n\s+status:\s*([^\n]+)/)?.[1]?.trim()
    const source = block.match(/\n\s+source:\s*([^\n]+)/)?.[1]?.trim()
    const owner = block.match(/\n\s+owner:\s*([^\n]+)/)?.[1]?.trim()
    const method = block.match(/\n\s+verification_method:\s*([^\n]+)/)?.[1]?.trim()
    if (!id) continue
    ids.push(id)
    if (!new Set(["confirmed", "needs-verification", "rejected"]).has(status)) fail(`${id}: недопустимый trust status`)
    if (!source || source === "null") fail(`${id}: отсутствует source`)
    if (!owner || owner === "null") fail(`${id}: отсутствует owner`)
    if (!method || method === "null") fail(`${id}: отсутствует verification_method`)
    if (status === "confirmed") {
      if (!/\n\s+verified_by:\s*(?!null\s*$).+/m.test(block)) fail(`${id}: confirmed без verified_by`)
      if (!/\n\s+verified_at:\s*"?\d{4}-\d{2}-\d{2}"?/m.test(block)) fail(`${id}: confirmed без verified_at`)
    }
  }
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
  if (duplicates.length) fail(`Дублирующиеся claim ID: ${[...new Set(duplicates)].join(", ")}`)
  if (!blocks.length) fail("knowledge/claims.yaml: не найдено ни одного claim")
}

// Archive provenance and immutability marker.
if (!existsSync(join(root, "archive/gemini/README.md"))) {
  fail("Архив Gemini не содержит README с правилами происхождения")
}

if (warnings.length) {
  console.warn("\nПредупреждения:")
  warnings.forEach((warning) => console.warn(`- ${warning}`))
}

if (errors.length) {
  console.error("\nПроверка ОС не пройдена:")
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`Проверка ОС пройдена: ${markdownFiles.length} Markdown, ${jsonFiles.length} JSON, структура и claims корректны.`)
