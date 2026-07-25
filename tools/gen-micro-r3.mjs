/**
 * Micro R3 — fewer marks, more detail; tight lockups; food-readable at distance.
 * No clever line wordmarks. No letter/seal. Max 2 inks.
 * Grid unit 8px. Pastry #FAF7F0, terra brighter #C95530.
 */
import fs from "node:fs"
import path from "node:path"

const outM = "design/assets/micro/r3/marks"
const outL = "design/assets/micro/r3/lockups"
const outPub = "public"
for (const d of [outM, outL]) fs.mkdirSync(d, { recursive: true })

const pastry = "#FAF7F0"
const terra = "#C95530" // brighter for daytime signage
const graph = "#28211D"
const terraDark = "#A34428" // depth only inside marks

function svg(body, w = 128, h = 128) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none" role="img">
${body}
</svg>
`
}

function card(inner) {
  return svg(`  <rect width="128" height="128" rx="28" fill="${pastry}"/>
${inner}`)
}

function mono(inner) {
  const g = inner
    .replaceAll(terra, graph)
    .replaceAll(terraDark, graph)
    .replaceAll('opacity="0.55"', 'opacity="0.35"')
    .replaceAll('opacity="0.7"', 'opacity="0.4"')
  return card(g)
}

// ——— DETAILED FOOD MARKS (7) ———

const marks = {
  // 1. Sandwich / burger-samsa cross-section — hero food read
  "m01-sandwich": `
  <!-- outer bun shell -->
  <path fill="${terra}" d="
    M30 42
    C30 30 44 24 64 24
    C84 24 98 30 98 42
    V90
    C98 102 84 108 64 108
    C44 108 30 102 30 90 Z"/>
  <!-- top bun highlight -->
  <path fill="${terraDark}" opacity="0.35" d="
    M36 44 C40 34 52 30 64 30 C76 30 88 34 92 44
    C84 40 74 38 64 38 C54 38 44 40 36 44 Z"/>
  <!-- sesame seeds -->
  <ellipse cx="48" cy="38" rx="2.2" ry="1.4" fill="${pastry}" transform="rotate(-20 48 38)"/>
  <ellipse cx="64" cy="34" rx="2.2" ry="1.4" fill="${pastry}"/>
  <ellipse cx="78" cy="38" rx="2.2" ry="1.4" fill="${pastry}" transform="rotate(18 78 38)"/>
  <ellipse cx="56" cy="40" rx="1.8" ry="1.2" fill="${pastry}" transform="rotate(-8 56 40)"/>
  <!-- pastry layers (negative gaps) -->
  <rect x="40" y="48" width="48" height="5" rx="2.5" fill="${pastry}"/>
  <rect x="40" y="56" width="48" height="4" rx="2" fill="${pastry}" opacity="0.85"/>
  <!-- lettuce fringe -->
  <path fill="${graph}" opacity="0.2" d="
    M40 62
    Q46 58 52 62 Q58 66 64 62 Q70 58 76 62 Q82 66 88 62
    V66 H40 Z"/>
  <!-- chicken filling -->
  <path fill="${graph}" d="
    M42 66
    C44 64 52 62 64 62
    C76 62 84 64 86 66
    V78
    C84 82 76 84 64 84
    C52 84 44 82 42 78 Z"/>
  <!-- chicken texture lines -->
  <path stroke="${pastry}" stroke-width="1.2" stroke-linecap="round" opacity="0.5"
    d="M50 70 H74 M48 74 H72 M52 78 H70"/>
  <!-- bottom bun shade -->
  <path fill="${terraDark}" opacity="0.4" d="
    M34 88 C40 96 52 100 64 100 C76 100 88 96 94 88
    C88 92 76 94 64 94 C52 94 40 92 34 88 Z"/>
  <!-- drip sauce hint -->
  <path fill="${terraDark}" d="M70 84 C72 90 74 94 72 98 C70 96 68 90 70 84 Z"/>`,

  // 2. Bowl with visible food — lunch/hospitality
  "m02-bowl": `
  <!-- bowl body -->
  <path fill="${terra}" d="
    M26 62 H102
    C100 62 96 98 64 108
    C32 98 28 62 26 62 Z"/>
  <!-- bowl inner shadow -->
  <path fill="${terraDark}" opacity="0.35" d="
    M32 68 H96
    C94 68 90 94 64 102
    C38 94 34 68 32 68 Z"/>
  <!-- rim -->
  <ellipse cx="64" cy="60" rx="40" ry="13" fill="${graph}"/>
  <ellipse cx="64" cy="58" rx="32" ry="9" fill="${pastry}"/>
  <!-- rice mound -->
  <ellipse cx="64" cy="52" rx="26" ry="12" fill="${pastry}"/>
  <ellipse cx="64" cy="50" rx="22" ry="9" fill="${pastry}" stroke="${graph}" stroke-width="0.8" opacity="0.9"/>
  <!-- chicken pieces on top -->
  <path fill="${terra}" d="M44 48 C48 40 56 38 62 42 C58 48 52 52 44 48 Z"/>
  <path fill="${terraDark}" d="M58 44 C64 36 74 36 80 44 C74 50 66 52 58 44 Z"/>
  <path fill="${terra}" d="M72 48 C78 42 88 44 90 52 C82 54 76 54 72 48 Z"/>
  <!-- green accent as herb (tiny, still 2-ink family via graph) -->
  <path fill="${graph}" d="M50 46 C52 42 54 42 55 46 C53 48 51 48 50 46 Z"/>
  <path fill="${graph}" d="M68 42 C70 38 73 38 74 42 C72 44 69 44 68 42 Z"/>
  <!-- steam -->
  <path fill="none" stroke="${graph}" stroke-width="2.2" stroke-linecap="round" opacity="0.35"
    d="M50 34 C52 28 56 26 58 30 M64 32 C66 24 70 22 72 28 M76 36 C78 30 82 28 84 32"/>`,

  // 3. Crest bird — refined, more feather detail
  "m03-crest": `
  <!-- body -->
  <path fill="${terra}" d="
    M34 82
    C34 54 50 38 72 38
    C86 38 96 46 100 58
    C92 54 84 54 78 58
    C88 62 94 72 94 84
    C94 100 80 110 60 110
    C44 110 34 98 34 82 Z"/>
  <!-- wing feather layers -->
  <path fill="${terraDark}" opacity="0.45" d="
    M48 78
    C52 68 62 62 74 64
    C68 74 60 82 50 88
    C48 84 48 80 48 78 Z"/>
  <path fill="${pastry}" opacity="0.35" d="
    M52 86
    C58 78 68 74 78 76
    C72 86 62 92 54 94
    C52 92 52 88 52 86 Z"/>
  <!-- crest blades -->
  <path fill="${terra}" d="M70 38 C72 24 80 14 90 10 C82 22 80 30 78 38 Z"/>
  <path fill="${terra}" d="M78 40 C86 26 98 18 110 16 C100 28 96 36 92 44 Z"/>
  <path fill="${terraDark}" d="M88 44 C96 34 110 30 118 34 C108 44 100 50 94 54 Z"/>
  <!-- beak -->
  <path fill="${graph}" d="M100 60 L120 70 L100 80 Z"/>
  <!-- eye socket (not cartoon eyeball — dark void) -->
  <circle cx="78" cy="62" r="4.5" fill="${graph}"/>
  <circle cx="79.5" cy="61" r="1.6" fill="${pastry}" opacity="0.7"/>`,

  // 4. Chicken fillet / strip with grill detail
  "m04-fillet": `
  <circle cx="64" cy="64" r="44" fill="none" stroke="${graph}" stroke-width="5"/>
  <!-- fillet body -->
  <path fill="${terra}" d="
    M40 86
    C34 74 36 50 50 40
    C60 32 76 30 88 40
    C100 50 102 68 94 82
    C86 96 70 102 56 98
    C46 95 42 92 40 86 Z"/>
  <!-- grill marks -->
  <path stroke="${graph}" stroke-width="2.5" stroke-linecap="round" opacity="0.35"
    d="M50 52 L78 46 M48 62 L80 56 M48 72 L78 66 M52 82 L76 76"/>
  <!-- highlight edge -->
  <path fill="${pastry}" opacity="0.35" d="
    M56 48
    C64 42 76 44 84 52
    C78 50 68 48 60 52
    C56 54 54 52 56 48 Z"/>
  <!-- tip darker -->
  <path fill="${terraDark}" opacity="0.5" d="
    M78 78
    C84 72 90 70 94 74
    C90 82 84 88 76 90
    C76 86 76 82 78 78 Z"/>`,

  // 5. Samsa / wedge layered pastry — product DNA
  "m05-samsa": `
  <!-- triangle body -->
  <path fill="${terra}" d="M24 100 L64 22 L104 100 Z"/>
  <!-- inner dough layers -->
  <path fill="${pastry}" d="M40 90 L64 42 L88 90 Z"/>
  <path fill="${terra}" d="M48 88 L64 52 L80 88 Z"/>
  <!-- filling window -->
  <path fill="${graph}" d="M54 82 L64 60 L74 82 Z"/>
  <!-- crust crimp marks along edges -->
  <path fill="none" stroke="${terraDark}" stroke-width="2" stroke-linecap="round" opacity="0.55"
    d="M32 92 L40 78 M36 96 L46 80 M92 78 L100 92 M82 80 L96 96"/>
  <!-- top fold notch -->
  <path fill="${terraDark}" d="M64 22 L70 36 L64 32 L58 36 Z"/>
  <!-- steam tiny -->
  <path fill="none" stroke="${graph}" stroke-width="1.8" stroke-linecap="round" opacity="0.3"
    d="M64 14 C66 10 70 10 70 14"/>`,

  // 6. Kraft box with product peek — takeaway readable
  "m06-box": `
  <!-- box body -->
  <path fill="${terra}" d="
    M28 48 H100 V96
    C100 104 92 108 84 108 H44
    C36 108 28 104 28 96 Z"/>
  <!-- lid -->
  <path fill="${terraDark}" d="
    M28 48
    L40 32 H88 L100 48 Z"/>
  <path fill="${terra}" d="
    M34 48
    L44 36 H84 L94 48 Z"/>
  <!-- lid slot -->
  <rect x="54" y="38" width="20" height="4" rx="2" fill="${pastry}"/>
  <!-- front window / product -->
  <rect x="40" y="60" width="48" height="36" rx="6" fill="${pastry}"/>
  <!-- sandwich peek -->
  <path fill="${terra}" d="M46 78 C46 70 54 66 64 66 C74 66 82 70 82 78 V88 H46 Z"/>
  <rect x="50" y="72" width="28" height="3" rx="1.5" fill="${pastry}"/>
  <rect x="52" y="78" width="24" height="8" rx="3" fill="${graph}"/>
  <!-- brand stripe -->
  <rect x="28" y="52" width="72" height="5" fill="${graph}" opacity="0.25"/>`,

  // 7. Hands-off: large product bite circle (app icon style)
  "m07-bite-badge": `
  <circle cx="64" cy="64" r="46" fill="${terra}"/>
  <!-- bite notch (cookie-style food cue) -->
  <circle cx="96" cy="40" r="16" fill="${pastry}"/>
  <!-- inner sandwich stack -->
  <path fill="${pastry}" d="
    M40 50
    C40 42 50 38 64 38
    C78 38 88 42 88 50
    V78
    C88 86 78 90 64 90
    C50 90 40 86 40 78 Z"/>
  <rect x="48" y="52" width="32" height="4" rx="2" fill="${terra}"/>
  <rect x="48" y="60" width="32" height="10" rx="4" fill="${graph}"/>
  <rect x="48" y="74" width="32" height="4" rx="2" fill="${terra}"/>
  <!-- crumb dots -->
  <circle cx="44" cy="44" r="2" fill="${pastry}" opacity="0.8"/>
  <circle cx="38" cy="52" r="1.5" fill="${pastry}" opacity="0.6"/>
  <circle cx="86" cy="80" r="2" fill="${pastry}" opacity="0.5"/>`,
}

const catalog = []
for (const [id, inner] of Object.entries(marks)) {
  fs.writeFileSync(path.join(outM, `${id}.svg`), card(inner))
  fs.writeFileSync(path.join(outM, `${id}-mono.svg`), mono(inner))
  catalog.push(id)
}

// primary app icon = sandwich
fs.writeFileSync(path.join(outPub, "icon.svg"), card(marks["m01-sandwich"]))
fs.writeFileSync(path.join(outPub, "logo-mark.svg"), card(marks["m01-sandwich"]))

// ——— LOCKUPS: smaller gap (8px), optical vertical center ———
// Mark drawn at 72×72, text baseline aligned to mark optical center

function lockup(id, markInner, theme = "light") {
  const bg = theme === "dark" ? graph : pastry
  const chicken = theme === "dark" ? pastry : graph
  const fit = terra
  // mark box: x=12, y=20, scale 72/128 = 0.5625 → visual 72px
  // text starts at x=12+72+8=92 (gap 8)
  // font size 40, dominant baseline middle of cap height ≈ y=68 for optical center with mark
  return svg(
    `  <rect width="420" height="112" fill="${bg}"/>
  <g transform="translate(12 20) scale(0.5625)">
${markInner}
  </g>
  <text x="92" y="72" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="40" font-weight="700" letter-spacing="-1.2">
    <tspan fill="${chicken}">Chicken</tspan><tspan fill="${fit}">Fit</tspan>
  </text>`,
    420,
    112,
  )
}

function lockupStacked(id, markInner, theme = "light") {
  const bg = theme === "dark" ? graph : pastry
  const chicken = theme === "dark" ? pastry : graph
  return svg(
    `  <rect width="200" height="200" fill="${bg}"/>
  <g transform="translate(36 16) scale(0.5)">
${markInner}
  </g>
  <text x="100" y="168" text-anchor="middle" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="22" font-weight="700" letter-spacing="-0.5">
    <tspan fill="${chicken}">Chicken</tspan><tspan fill="${terra}">Fit</tspan>
  </text>`,
    200,
    200,
  )
}

// tight lockups for best food-read candidates
const lockIds = ["m01-sandwich", "m02-bowl", "m03-crest", "m04-fillet", "m05-samsa", "m06-box", "m07-bite-badge"]

for (const id of lockIds) {
  fs.writeFileSync(path.join(outL, `lock-${id}.svg`), lockup(id, marks[id], "light"))
  fs.writeFileSync(path.join(outL, `lock-${id}-dark.svg`), lockup(id, marks[id], "dark"))
  fs.writeFileSync(path.join(outL, `stack-${id}.svg`), lockupStacked(id, marks[id], "light"))
}

// signage strip: wide, high contrast for distance
fs.writeFileSync(
  path.join(outL, "signage-day.svg"),
  svg(
    `  <rect width="640" height="160" fill="${graph}"/>
  <g transform="translate(24 32) scale(0.75)">
${marks["m01-sandwich"]}
  </g>
  <text x="140" y="100" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="64" font-weight="700" letter-spacing="-2">
    <tspan fill="${pastry}">Chicken</tspan><tspan fill="${terra}">Fit</tspan>
  </text>`,
    640,
    160,
  ),
)

fs.writeFileSync(
  path.join(outL, "signage-night.svg"),
  svg(
    `  <rect width="640" height="160" fill="#12100E"/>
  <!-- glow simulation -->
  <text x="140" y="100" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="64" font-weight="700" letter-spacing="-2" fill="${terra}" opacity="0.25" filter="url(#g)">ChickenFit</text>
  <defs>
    <filter id="g"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
  <g transform="translate(24 32) scale(0.75)">
${marks["m01-sandwich"]}
  </g>
  <text x="140" y="100" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="64" font-weight="700" letter-spacing="-2">
    <tspan fill="#FFF6EC">Chicken</tspan><tspan fill="#FF6B35">Fit</tspan>
  </text>`,
    640,
    160,
  ),
)

fs.writeFileSync(
  "design/assets/micro/r3/catalog.json",
  JSON.stringify(
    {
      round: 3,
      pastry,
      terra,
      graph,
      principles: [
        "fewer marks more detail",
        "food-readable at distance",
        "icon+word gap 8px",
        "no clever line wordmarks",
        "max 2 inks",
        "light + dark + signage",
      ],
      marks: catalog,
    },
    null,
    2,
  ) + "\n",
)

console.log("R3 marks", catalog.length, "lockups generated")
