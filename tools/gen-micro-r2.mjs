/**
 * Micro-assemblies Round 2
 * - Kill D letter / E seal standalone
 * - 8px grid, max 2 inks (graphite + terracotta)
 * - Lighter pastry #F7F1E6
 * - Marks A/B/C/F/G refined + wordmark clever W + lockups
 */
import fs from "node:fs"
import path from "node:path"

const outMarks = "design/assets/micro/r2/marks"
const outLock = "design/assets/micro/r2/lockups"
const outWord = "design/assets/micro/r2/wordmarks"
for (const d of [outMarks, outLock, outWord]) fs.mkdirSync(d, { recursive: true })

const pastry = "#F7F1E6" // lighter
const terra = "#B94D2F"
const graph = "#28211D"
// olive intentionally unused in logos

const U = 8 // grid unit
const S = 128

function svg(content, w = S, h = S) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
${content}
</svg>
`
}

function card(inner) {
  return svg(`  <rect width="128" height="128" rx="28" fill="${pastry}"/>
${inner}`)
}

function monoCard(inner) {
  // pure graphite on white-ish pastry for stamp test
  return svg(`  <rect width="128" height="128" rx="28" fill="${pastry}"/>
${inner.replaceAll(terra, graph)}`)
}

// ——— MARKS on 8px grid, 1–2 colors, optical center ≈ y=64 ———

const marks = {
  // A · product — single form, layers as negative only
  "a01-bite-shell": `
  <!-- shell on grid: x 32–96, y 28–100 -->
  <path fill="${terra}" d="
    M32 44
    C32 32 44 28 64 28
    C84 28 96 32 96 44
    V88
    C96 100 84 100 64 100
    C44 100 32 100 32 88
    Z"/>
  <rect x="44" y="44" width="40" height="8" rx="4" fill="${pastry}"/>
  <rect x="44" y="60" width="40" height="8" rx="4" fill="${pastry}"/>
  <rect x="48" y="76" width="32" height="12" rx="6" fill="${graph}"/>`,

  "a02-wedge-clean": `
  <path fill="${terra}" d="M32 96 L64 32 L96 96 Z"/>
  <path fill="${pastry}" d="M48 84 L64 52 L80 84 Z"/>
  <path fill="${graph}" d="M56 84 L64 68 L72 84 Z"/>`,

  "a03-soft-stack": `
  <!-- three bars = product stack, SAME ink, not rainbow -->
  <rect x="36" y="32" width="56" height="16" rx="8" fill="${terra}"/>
  <rect x="32" y="56" width="64" height="16" rx="8" fill="${terra}" opacity="0.85"/>
  <rect x="36" y="80" width="56" height="16" rx="8" fill="${graph}"/>`,

  "a04-cut-pie": `
  <circle cx="64" cy="64" r="40" fill="${terra}"/>
  <path fill="${pastry}" d="M64 64 L104 64 A40 40 0 0 0 64 24 Z"/>
  <circle cx="64" cy="64" r="8" fill="${graph}"/>`,

  "a05-fold-packet": `
  <path fill="${terra}" d="M36 40 H92 V92 C92 100 84 104 76 104 H52 C44 104 36 100 36 92 Z"/>
  <path fill="${pastry}" d="M36 40 L64 60 L92 40"/>
  <rect x="52" y="72" width="24" height="8" rx="4" fill="${graph}"/>`,

  // B · bowl — hospitality, 2 inks max
  "b01-bowl": `
  <path fill="${terra}" d="M32 64 H96 C94 64 90 96 64 104 C38 96 34 64 32 64 Z"/>
  <ellipse cx="64" cy="60" rx="36" ry="12" fill="${graph}"/>
  <ellipse cx="64" cy="58" rx="26" ry="7" fill="${pastry}"/>
  <path fill="${terra}" d="M48 56 C52 40 58 36 64 36 C70 36 76 40 80 56 C72 50 68 48 64 48 C60 48 56 50 48 56 Z"/>`,

  "b02-bowl-flat": `
  <ellipse cx="64" cy="72" rx="40" ry="12" fill="${graph}"/>
  <path fill="${terra}" d="M28 72 C30 96 44 108 64 108 C84 108 98 96 100 72"/>
  <ellipse cx="64" cy="56" rx="20" ry="9" fill="${terra}"/>`,

  "b03-tray-simple": `
  <rect x="28" y="52" width="72" height="32" rx="8" fill="${terra}"/>
  <rect x="36" y="60" width="56" height="16" rx="4" fill="${pastry}"/>
  <rect x="44" y="64" width="24" height="8" rx="2" fill="${graph}"/>`,

  // C · bird — geometric, no cartoon eye if possible; c02 keeps small optical point
  "c01-crest": `
  <path fill="${terra}" d="
    M36 84
    C36 56 52 40 72 40
    C84 40 94 48 98 60
    C90 56 82 56 76 60
    C86 64 92 74 92 86
    C92 100 78 108 60 108
    C44 108 36 98 36 84 Z"/>
  <path fill="${terra}" d="M70 40 C72 28 78 20 86 16 C80 26 78 34 76 40 Z"/>
  <path fill="${terra}" d="M78 42 C84 30 94 24 104 22 C96 32 92 38 88 44 Z"/>
  <path fill="${graph}" d="M98 62 L116 70 L98 78 Z"/>`,

  "c02-profile": `
  <path fill="${terra}" d="
    M28 76
    C36 48 56 36 76 40
    C90 42 100 54 102 68
    C92 62 82 62 74 68
    C84 74 90 84 88 96
    C84 110 68 116 50 112
    C32 108 24 94 28 76 Z"/>
  <circle cx="80" cy="60" r="3" fill="${graph}"/>
  <path fill="${graph}" d="M100 68 C110 70 116 76 120 84 C110 82 104 78 100 74 Z"/>`,

  "c03-comb-circle": `
  <circle cx="64" cy="72" r="28" fill="${terra}"/>
  <path fill="${graph}" d="
    M50 52
    C54 36 62 28 70 24
    C68 36 68 44 66 52
    C74 40 84 36 94 36
    C88 46 86 52 84 58
    C92 50 102 48 110 50
    C102 58 96 66 92 74
    H50 Z"/>`,

  "c04-wing": `
  <path fill="${terra}" d="
    M28 88
    C28 72 44 48 72 44
    C96 40 108 56 104 76
    C100 96 80 108 56 104
    C36 100 28 96 28 88 Z"/>
  <path fill="${pastry}" d="M48 72 C58 60 74 56 88 60 C78 72 70 84 66 96 C56 88 50 80 48 72 Z"/>`,

  // F · strip / cook — one form
  "f01-fillet": `
  <circle cx="64" cy="64" r="42" fill="none" stroke="${graph}" stroke-width="6"/>
  <path fill="${terra}" d="
    M42 84
    C38 74 40 52 52 42
    C62 34 78 34 88 44
    C98 54 98 70 90 82
    C82 94 66 98 54 94
    C46 91 44 88 42 84 Z"/>`,

  "f02-one-strip": `
  <path fill="${terra}" d="
    M40 40
    C56 28 80 28 96 48
    C104 58 100 80 84 92
    C68 104 48 100 40 84
    C32 68 32 52 40 40 Z"/>
  <path fill="${pastry}" d="
    M56 56
    C64 50 76 52 82 62
    C86 70 82 80 72 84
    C62 88 52 82 50 72
    C48 64 50 58 56 56 Z"/>`,

  "f03-grill-min": `
  <rect x="32" y="32" width="64" height="64" rx="12" fill="${terra}"/>
  <path stroke="${pastry}" stroke-width="6" stroke-linecap="round" fill="none"
    d="M48 44 V84 M64 44 V84 M80 44 V84"/>`,

  // G · hybrid minimal (local product + restraint) — no folklore
  "g01-sun-cut": `
  <circle cx="64" cy="64" r="40" fill="${terra}"/>
  <rect x="40" y="48" width="48" height="8" rx="4" fill="${pastry}"/>
  <rect x="40" y="64" width="48" height="8" rx="4" fill="${pastry}"/>
  <rect x="44" y="80" width="40" height="8" rx="4" fill="${graph}"/>`,

  "g02-arch": `
  <path fill="${terra}" d="
    M36 104 V56
    C36 36 48 28 64 28
    C80 28 92 36 92 56
    V104 H76 V56
    C76 48 72 44 64 44
    C56 44 52 48 52 56
    V104 Z"/>`,

  "g03-seed": `
  <circle cx="64" cy="64" r="40" fill="${graph}"/>
  <path fill="${terra}" d="
    M64 32
    C76 48 80 60 80 72
    C80 84 76 96 64 112
    C52 96 48 84 48 72
    C48 60 52 48 64 32 Z"/>`,
}

// write color + mono for each mark
const catalog = []
for (const [id, inner] of Object.entries(marks)) {
  fs.writeFileSync(path.join(outMarks, `${id}.svg`), card(inner))
  fs.writeFileSync(path.join(outMarks, `${id}-mono.svg`), monoCard(inner))
  catalog.push({ id, family: id[0], files: [`r2/marks/${id}.svg`, `r2/marks/${id}-mono.svg`] })
}

// ——— WORDMARK clever (W) — text paths approximated with system fonts + geometry accents ———
// Note: final will be outlined type; here structure + hidden gesture

function wordmark(id, accentSvg) {
  // wide canvas for wordmark study
  return svg(
    `  <rect width="480" height="128" fill="${pastry}"/>
  <text x="40" y="78" font-family="Arial Black, Helvetica, sans-serif" font-size="52" font-weight="700" letter-spacing="-1.5">
    <tspan fill="${graph}">Chicken</tspan><tspan fill="${terra}">Fit</tspan>
  </text>
${accentSvg}`,
    480,
    128,
  )
}

const wordmarks = {
  "w01-plain": wordmark(
    "w01",
    `  <!-- baseline control -->
  <line x1="40" y1="96" x2="360" y2="96" stroke="${graph}" stroke-width="1" opacity="0.08"/>`,
  ),
  "w02-fit-arc": wordmark(
    "w02",
    `  <!-- hospitality arc under Fit only — not full Amazon clone -->
  <path d="M248 92 C280 108 320 108 352 92" fill="none" stroke="${terra}" stroke-width="4" stroke-linecap="round"/>`,
  ),
  "w03-layer-bar": wordmark(
    "w03",
    `  <!-- product layer: single thin bar through midline of word (cut / layer) -->
  <rect x="40" y="58" width="320" height="3" fill="${terra}" opacity="0.9"/>`,
  ),
  "w04-nF-gap": wordmark(
    "w04",
    `  <!-- emphasis: gap zone between n and F as intentional cut -->
  <rect x="232" y="40" width="6" height="48" fill="${pastry}"/>
  <rect x="234" y="44" width="2" height="40" fill="${terra}"/>`,
  ),
  "w05-underline-shift": wordmark(
    "w05",
    `  <!-- three short underlines under Fit = layers, but secondary to letters -->
  <rect x="250" y="96" width="28" height="4" rx="2" fill="${terra}"/>
  <rect x="282" y="96" width="28" height="4" rx="2" fill="${terra}" opacity="0.7"/>
  <rect x="314" y="96" width="28" height="4" rx="2" fill="${terra}" opacity="0.45"/>`,
  ),
}

for (const [id, content] of Object.entries(wordmarks)) {
  fs.writeFileSync(path.join(outWord, `${id}.svg`), content)
  catalog.push({ id, family: "W", files: [`r2/wordmarks/${id}.svg`] })
}

// ——— LOCKUPS: mark (left) + ChickenFit (right), grid gap 16 ———
function lockup(markId, markInner) {
  return svg(
    `  <rect width="520" height="128" fill="${pastry}"/>
  <!-- mark box 96x96 at x=16 y=16 -->
  <g transform="translate(16 16) scale(0.75)">
    <rect width="128" height="128" rx="28" fill="${pastry}" stroke="${graph}" stroke-width="0" opacity="0"/>
${markInner}
  </g>
  <text x="128" y="78" font-family="Arial Black, Helvetica, sans-serif" font-size="44" font-weight="700" letter-spacing="-1">
    <tspan fill="${graph}">Chicken</tspan><tspan fill="${terra}">Fit</tspan>
  </text>`,
    520,
    128,
  )
}

// select refined lockup partners
const lockPartners = [
  "a01-bite-shell",
  "a04-cut-pie",
  "b01-bowl",
  "c01-crest",
  "f01-fillet",
  "g01-sun-cut",
  "g03-seed",
]

for (const id of lockPartners) {
  const file = `l1-${id}.svg`
  fs.writeFileSync(path.join(outLock, file), lockup(id, marks[id]))
  catalog.push({ id: `l1-${id}`, family: "L1", files: [`r2/lockups/${file}`] })
}

// type specimen lockups (HTML will use fonts; SVG uses metric placeholder note)
fs.writeFileSync(
  "design/assets/micro/r2/catalog.json",
  JSON.stringify(
    {
      pastry,
      terra,
      graph,
      gridUnit: U,
      killedFamilies: ["D-letter", "E-seal"],
      typeShortlist: ["T2", "T4", "T7"],
      items: catalog,
    },
    null,
    2,
  ) + "\n",
)

console.log(
  "R2 marks",
  Object.keys(marks).length,
  "wordmarks",
  Object.keys(wordmarks).length,
  "lockups",
  lockPartners.length,
)
