// Gera os rasters da marca-ícone (conceito 1a) a partir de um SVG mestre com
// teal em sRGB hex (NÃO oklch — librsvg/resvg podem não parsear). Saídas em
// public/. Script "scratch": rodar uma vez, commitar só os outputs.
//
//   pnpm add -Dw sharp png-to-ico
//   node apps/frontend/scripts/generate-brand-icons.mjs
//   pnpm remove -w sharp png-to-ico
//
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { writeFile } from "node:fs/promises"
import { Buffer } from "node:buffer"
import sharp from "sharp"
import pngToIco from "png-to-ico"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, "..", "public")

// teal-600 (≈ oklch(0.6 0.118 184.704)) em sRGB hex
const TEAL = "#0d9488"

// SVG do 1a com a casa branca (canônico). `bg` opcional preenche o fundo todo
// (usado no maskable, que precisa de área de segurança).
const markSvg = ({ bg = null } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  ${bg ? `<rect width="96" height="96" fill="${bg}"/>` : ""}
  <rect width="96" height="96" rx="26" fill="${TEAL}"/>
  <path d="M48 24 L74 45 L74 68 A6 6 0 0 1 68 74 L28 74 A6 6 0 0 1 22 68 L22 45 Z" fill="#ffffff"/>
  <path d="M41 74 L41 56 A7 7 0 0 1 55 56 L55 74 Z" fill="${TEAL}"/>
</svg>`

// Maskable: o tile ocupa ~72% central (safe zone dos ícones adaptativos),
// fundo teal sangrando até a borda.
const maskableSvg = () => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${TEAL}"/>
  <g transform="translate(72,72) scale(3.83)">
    <path d="M48 24 L74 45 L74 68 A6 6 0 0 1 68 74 L28 74 A6 6 0 0 1 22 68 L22 45 Z" fill="#ffffff"/>
    <path d="M41 74 L41 56 A7 7 0 0 1 55 56 L55 74 Z" fill="${TEAL}"/>
  </g>
</svg>`

async function png(svg, size, out) {
  const buf = await sharp(Buffer.from(svg))
    .resize(size, size, { fit: "contain" })
    .png()
    .toBuffer()
  await writeFile(join(PUBLIC, out), buf)
  return buf
}

async function main() {
  const base = markSvg()

  // Apple touch — sem transparência; tile sangra até a borda.
  await png(markSvg(), 180, "apple-touch-icon.png")
  // PWA
  await png(base, 192, "icon-192.png")
  await png(base, 512, "icon-512.png")
  await png(maskableSvg(), 512, "icon-maskable-512.png")

  // favicon.ico (16/32/48) — png-to-ico aceita array de buffers PNG
  const ico16 = await sharp(Buffer.from(base)).resize(16, 16).png().toBuffer()
  const ico32 = await sharp(Buffer.from(base)).resize(32, 32).png().toBuffer()
  const ico48 = await sharp(Buffer.from(base)).resize(48, 48).png().toBuffer()
  const ico = await pngToIco([ico16, ico32, ico48])
  await writeFile(join(PUBLIC, "favicon.ico"), ico)

  console.log("✓ ícones gerados em public/")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
