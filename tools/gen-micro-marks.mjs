import fs from "node:fs"
import path from "node:path"

const root = "design/assets/micro/marks"
fs.mkdirSync(root, { recursive: true })

const pastry = "#F3E7D3"
const terra = "#B94D2F"
const graph = "#28211D"
const olive = "#667447"

function card(inner, bg = pastry) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img">
  <rect width="128" height="128" rx="28" fill="${bg}"/>
  ${inner}
</svg>
`
}

const marks = {
  "a01-layer-arc": card(`
    <path fill="${terra}" d="M28 78c0-28 16-48 36-48s36 20 36 48c0 8-8 14-20 14H48c-12 0-20-6-20-14z"/>
    <path fill="${pastry}" d="M40 62h48v8H40z"/>
    <path fill="${pastry}" d="M40 48h48v8H40z"/>
    <ellipse cx="64" cy="84" rx="16" ry="7" fill="${graph}"/>
  `),
  "a02-wedge": card(`
    <path fill="${terra}" d="M24 92 L64 24 L104 92 Z"/>
    <path fill="${pastry}" d="M40 80 L64 40 L88 80 Z"/>
    <path fill="${graph}" d="M48 80 L64 52 L80 80 Z"/>
  `),
  "a03-stack-soft": card(`
    <rect x="34" y="28" width="60" height="16" rx="8" fill="${terra}"/>
    <rect x="30" y="48" width="68" height="16" rx="8" fill="${graph}"/>
    <rect x="34" y="68" width="60" height="16" rx="8" fill="${terra}"/>
    <rect x="38" y="88" width="52" height="12" rx="6" fill="${olive}"/>
  `),
  "a04-cutaway": card(`
    <circle cx="64" cy="64" r="42" fill="${terra}"/>
    <path fill="${pastry}" d="M64 64 L106 64 A42 42 0 0 0 64 22 Z"/>
    <path fill="${graph}" d="M64 64 L64 106 A42 42 0 0 0 106 64 Z"/>
    <circle cx="64" cy="64" r="10" fill="${pastry}"/>
  `),
  "a05-fold": card(`
    <path fill="${terra}" d="M30 36h68v56c0 12-10 20-22 20H52c-12 0-22-8-22-20V36z"/>
    <path fill="${pastry}" d="M30 36 L64 58 L98 36"/>
    <path fill="${graph}" d="M48 72h32v8H48z"/>
  `),
  "b01-bowl-steam": card(`
    <path fill="${terra}" d="M30 60h68c-2 28-18 42-34 42S32 88 30 60z"/>
    <ellipse cx="64" cy="58" rx="38" ry="12" fill="${graph}"/>
    <ellipse cx="64" cy="56" rx="28" ry="8" fill="${pastry}"/>
    <path stroke="${terra}" stroke-width="4" stroke-linecap="round" fill="none" d="M50 40c2-8 6-12 14-12M64 38c2-10 8-14 14-10M78 42c0-8 4-12 10-10"/>
  `),
  "b02-donburi": card(`
    <ellipse cx="64" cy="70" rx="40" ry="14" fill="${graph}"/>
    <path fill="${terra}" d="M28 70c2 22 18 34 36 34s34-12 36-34"/>
    <ellipse cx="64" cy="52" rx="22" ry="10" fill="${terra}"/>
    <circle cx="56" cy="50" r="4" fill="${pastry}"/>
    <circle cx="70" cy="48" r="3" fill="${olive}"/>
  `),
  "b03-tray": card(`
    <rect x="24" y="48" width="80" height="40" rx="8" fill="${terra}"/>
    <rect x="32" y="56" width="64" height="24" rx="4" fill="${pastry}"/>
    <rect x="40" y="62" width="28" height="12" rx="3" fill="${graph}"/>
    <rect x="72" y="62" width="16" height="12" rx="3" fill="${olive}"/>
  `),
  "c01-crest-min": card(`
    <path fill="${terra}" d="M38 80c0-22 14-36 30-36 12 0 22 8 26 18-6-2-12-2-18 2 8 4 12 12 12 22 0 14-12 22-28 22s-22-12-22-28z"/>
    <path fill="${terra}" d="M66 44c2-10 8-16 14-18-4 8-4 14-4 18"/>
    <path fill="${terra}" d="M74 46c6-10 14-14 22-14-8 8-10 14-12 18"/>
    <path fill="${graph}" d="M94 58l16 8-16 8z"/>
  `),
  "c02-side-profile": card(`
    <path fill="${terra}" d="M28 72c8-28 28-40 48-36 14 2 24 14 26 28-10-6-20-4-28 2 10 6 14 16 12 28-4 16-20 24-38 20S22 90 28 72z"/>
    <circle cx="78" cy="58" r="4" fill="${graph}"/>
    <path fill="${graph}" d="M96 62c8 2 14 6 18 12-10 0-16-2-22-6z"/>
  `),
  "c03-comb-only": card(`
    <circle cx="64" cy="72" r="28" fill="${terra}"/>
    <path fill="${graph}" d="M48 52c4-16 12-24 20-28 2 10 2 18 0 24 8-12 18-16 28-16-6 10-8 18-8 24 8-8 16-10 24-8-8 8-12 16-14 24H48z"/>
  `),
  "c04-abstract-wing": card(`
    <path fill="${terra}" d="M30 84c0-8 8-28 34-40 26-12 40 0 40 16 0 20-16 32-40 36S30 100 30 84z"/>
    <path fill="${pastry}" d="M48 70c8-8 20-12 32-10-8 8-14 16-16 26-8-4-14-8-16-16z"/>
  `),
  "d01-c-ring": card(`
    <path fill="${terra}" fill-rule="evenodd" d="M64 22a42 42 0 1 0 0 84 42 42 0 0 0 30-12l-12-12a26 26 0 1 1 0-48l12-12A42 42 0 0 0 64 22z"/>
  `),
  "d02-cf-lock": card(`
    <text x="64" y="78" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="48" font-weight="700">
      <tspan fill="${graph}">C</tspan><tspan fill="${terra}">F</tspan>
    </text>
  `),
  "d03-c-stamp": card(`
    <circle cx="64" cy="64" r="44" fill="none" stroke="${graph}" stroke-width="6"/>
    <circle cx="64" cy="64" r="34" fill="none" stroke="${terra}" stroke-width="3"/>
    <text x="64" y="78" text-anchor="middle" font-family="Georgia, serif" font-size="44" font-weight="700" fill="${terra}">C</text>
  `),
  "d04-word-stack": card(`
    <text x="64" y="56" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="16" fill="${graph}" letter-spacing="3">CHICKEN</text>
    <text x="64" y="88" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="30" fill="${terra}" letter-spacing="4">FIT</text>
  `),
  "e01-enso-bite": card(`
    <path fill="none" stroke="${terra}" stroke-width="10" stroke-linecap="round" d="M90 40a36 36 0 1 0 8 36"/>
    <circle cx="64" cy="64" r="14" fill="${graph}"/>
  `),
  "e02-square-seal": card(`
    <rect x="28" y="28" width="72" height="72" rx="6" fill="none" stroke="${terra}" stroke-width="6"/>
    <path fill="${terra}" d="M48 48h32v8H56v12h20v8H56v16H48z"/>
  `),
  "e03-double-ring": card(`
    <circle cx="64" cy="64" r="44" fill="none" stroke="${graph}" stroke-width="5"/>
    <circle cx="64" cy="64" r="30" fill="none" stroke="${terra}" stroke-width="5"/>
    <path fill="${terra}" d="M54 50h8v28h-8zm12 0h8v28h-8z"/>
  `),
  "e04-badge": card(`
    <path fill="${terra}" d="M64 18l10 20 22 4-16 16 4 22-20-10-20 10 4-22-16-16 22-4z"/>
    <circle cx="64" cy="64" r="14" fill="${pastry}"/>
    <path fill="${graph}" d="M58 58h12v4H62v4h6v4h-6v6h-4z"/>
  `),
  "f01-fillet": card(`
    <circle cx="64" cy="64" r="44" fill="none" stroke="${graph}" stroke-width="6"/>
    <path fill="${terra}" d="M40 80c-4-8-2-28 10-38 10-8 26-10 36-2s14 24 8 36-20 18-32 14-18-4-22-10z"/>
  `),
  "f02-three-strips": card(`
    <path fill="${terra}" d="M36 40c8-4 20-4 28 4s8 20 0 28-20 8-28 0-8-20 0-32z"/>
    <path fill="${graph}" d="M52 36c8-4 20-4 28 4s8 20 0 28-20 8-28 0-8-20 0-32z"/>
    <path fill="${olive}" d="M68 40c8-4 20-4 28 4s8 20 0 28-20 8-28 0-8-20 0-32z"/>
  `),
  "f03-grill": card(`
    <rect x="30" y="30" width="68" height="68" rx="12" fill="${terra}"/>
    <path stroke="${pastry}" stroke-width="5" stroke-linecap="round" d="M44 42v44M64 42v44M84 42v44"/>
  `),
  "g01-sun-layer": card(`
    <circle cx="64" cy="64" r="40" fill="${terra}"/>
    <path fill="${pastry}" d="M36 64h56v10H36z"/>
    <path fill="${pastry}" d="M40 48h48v8H40z"/>
    <path fill="${graph}" d="M44 78h40v8H44z"/>
  `),
  "g02-arch-gate": card(`
    <path fill="${terra}" d="M32 100V56c0-20 14-32 32-32s32 12 32 32v44H80V56c0-10-6-16-16-16s-16 6-16 16v44H32z"/>
    <rect x="52" y="70" width="24" height="30" rx="4" fill="${pastry}"/>
  `),
  "g03-grain": card(`
    <circle cx="64" cy="64" r="42" fill="${graph}"/>
    <path fill="${terra}" d="M64 30c8 12 12 24 12 34s-4 22-12 34c-8-12-12-24-12-34s4-22 12-34z"/>
    <path fill="${pastry}" d="M64 42c4 8 6 14 6 20s-2 14-6 22c-4-8-6-14-6-22s2-14 6-22z"/>
  `),
  "g04-hand-stamp": card(`
    <rect x="22" y="22" width="84" height="84" rx="8" fill="${pastry}" stroke="${graph}" stroke-width="4"/>
    <text x="64" y="60" text-anchor="middle" font-family="Georgia,serif" font-size="12" fill="${graph}">SAMARQAND</text>
    <text x="64" y="88" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="22" fill="${terra}">CF</text>
  `),
}

const labels = {
  a: "A · Product / form",
  b: "B · Bowl / vessel",
  c: "C · Bird abstract",
  d: "D · Letter / word",
  e: "E · Seal / stamp (JP lens)",
  f: "F · Strip / cook",
  g: "G · Hybrid local×JP",
}

const catalog = []
for (const [id, svg] of Object.entries(marks)) {
  fs.writeFileSync(path.join(root, `${id}.svg`), svg)
  catalog.push({
    id,
    family: labels[id[0]] || id[0],
    file: `marks/${id}.svg`,
  })
}

fs.writeFileSync(
  "design/assets/micro/catalog.json",
  JSON.stringify(catalog, null, 2) + "\n",
)
console.log("wrote", catalog.length, "marks")
