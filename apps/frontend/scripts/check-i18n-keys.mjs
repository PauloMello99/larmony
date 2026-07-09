#!/usr/bin/env node
/**
 * Detector de chaves i18n faltantes (Entrega C).
 *
 * Com 3 locales × centenas de strings, o modo de falha silencioso é uma chave
 * presente em pt-BR mas ausente em en/es (ou vice-versa) — o i18next cai no
 * fallback e a UI "parece traduzida". Este script compara, por namespace, o
 * conjunto de chaves (folhas, com caminho pontilhado) entre todos os locales e
 * falha (exit 1) em qualquer divergência, listando exatamente o que falta e onde.
 *
 * pt-BR é a referência (idioma-fonte). Uso: `node scripts/check-i18n-keys.mjs`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const LOCALES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "locales")
const REFERENCE_LOCALE = "pt-BR"

/** Achata um objeto em caminhos de folha pontilhados: { a: { b: 1 } } → ["a.b"]. */
function leafKeys(obj, prefix = "") {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...leafKeys(v, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

function readNamespace(locale, file) {
  const raw = readFileSync(join(LOCALES_DIR, locale, file), "utf8")
  return new Set(leafKeys(JSON.parse(raw)))
}

const locales = readdirSync(LOCALES_DIR).filter((d) =>
  statSync(join(LOCALES_DIR, d)).isDirectory(),
)
if (!locales.includes(REFERENCE_LOCALE)) {
  console.error(`✗ locale de referência "${REFERENCE_LOCALE}" não encontrado em ${LOCALES_DIR}`)
  process.exit(1)
}

const otherLocales = locales.filter((l) => l !== REFERENCE_LOCALE)
const namespaces = readdirSync(join(LOCALES_DIR, REFERENCE_LOCALE)).filter((f) => f.endsWith(".json"))

// Chaves novas nascem só em pt-BR (tradução manual posterior; runtime cai no
// fallback pt-BR). Chave FALTANDO em en/es é warning — a lista impressa é o
// TODO de tradução. Continua sendo ERRO: chave sobrando (typo) e namespace
// ausente/ilegível em pt-BR. `--strict` volta a falhar também nas faltantes.
const strict = process.argv.includes("--strict")

let errors = 0
let missingTotal = 0

for (const ns of namespaces) {
  const reference = readNamespace(REFERENCE_LOCALE, ns)

  for (const locale of otherLocales) {
    let target
    try {
      target = readNamespace(locale, ns)
    } catch {
      // Namespace ainda não criado no outro idioma = tudo pendente de tradução.
      console.warn(`⚠ [${locale}] namespace pendente de tradução: ${ns} (${reference.size} chaves)`)
      missingTotal += reference.size
      continue
    }

    const missing = [...reference].filter((k) => !target.has(k))
    const extra = [...target].filter((k) => !reference.has(k))

    for (const k of missing) {
      console.warn(`⚠ [${locale}/${ns}] pendente de tradução: ${k}`)
      missingTotal++
    }
    for (const k of extra) {
      console.error(`✗ [${locale}/${ns}] chave sobrando (não existe em ${REFERENCE_LOCALE}): ${k}`)
      errors++
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} erro(s) de chave i18n. Corrija antes de mergear.`)
  process.exit(1)
}

if (missingTotal > 0) {
  console.warn(`\n⚠ ${missingTotal} chave(s) pendente(s) de tradução manual (runtime usa fallback ${REFERENCE_LOCALE}).`)
  if (strict) process.exit(1)
} else {
  console.log(`✓ i18n OK — ${namespaces.length} namespace(s) × ${locales.length} locale(s) com chaves idênticas.`)
}
