#!/usr/bin/env node
/**
 * Checker de sync dos locales (i18n, adendo ADR-0018).
 *
 * pt-BR é a fonte de verdade. Para cada um dos demais locales, cada namespace
 * precisa existir com EXATAMENTE o mesmo key-set (flatten profundo) e os mesmos
 * placeholders de interpolação `{{var}}` por chave. Faltante/extra/placeholder
 * divergente → exit 1 com relatório por namespace.
 *
 * Uso:  node bin/scripts/check-locales.mjs   (ou `pnpm check-locales`)
 * Roda no job `verify` do CI — drift de tradução quebra o pipeline.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOCALES_DIR = join(ROOT, "apps", "frontend", "public", "locales");
const REFERENCE = "pt-BR";

/** Achata um objeto JSON aninhado em chaves com ponto ("a.b.c"). */
function flatten(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}

/** Placeholders {{var}} de uma string de tradução (ordenados p/ comparação). */
function placeholders(value) {
  if (typeof value !== "string") return [];
  return [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((m) => m[1].trim()).sort();
}

function loadNamespace(locale, ns) {
  const file = join(LOCALES_DIR, locale, `${ns}.json`);
  if (!existsSync(file)) return null;
  return flatten(JSON.parse(readFileSync(file, "utf8")));
}

const locales = readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

if (!locales.includes(REFERENCE)) {
  console.error(`Locale de referência '${REFERENCE}' não encontrado em ${LOCALES_DIR}`);
  process.exit(1);
}

const namespaces = readdirSync(join(LOCALES_DIR, REFERENCE))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();

const targets = locales.filter((l) => l !== REFERENCE).sort();
let failures = 0;

for (const locale of targets) {
  const problems = [];

  // Namespaces extras (existem no locale mas não no pt-BR).
  const extraNs = readdirSync(join(LOCALES_DIR, locale))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((ns) => !namespaces.includes(ns));
  for (const ns of extraNs) problems.push(`namespace extra: ${ns}.json`);

  for (const ns of namespaces) {
    const ref = loadNamespace(REFERENCE, ns);
    const got = loadNamespace(locale, ns);
    if (got === null) {
      problems.push(`namespace faltando: ${ns}.json (${Object.keys(ref).length} chaves)`);
      continue;
    }
    const refKeys = new Set(Object.keys(ref));
    const gotKeys = new Set(Object.keys(got));
    const missing = [...refKeys].filter((k) => !gotKeys.has(k));
    const extra = [...gotKeys].filter((k) => !refKeys.has(k));
    for (const k of missing) problems.push(`${ns}: chave faltando '${k}'`);
    for (const k of extra) problems.push(`${ns}: chave extra '${k}'`);

    // Placeholders devem bater com o pt-BR (chaves presentes em ambos).
    for (const k of refKeys) {
      if (!gotKeys.has(k)) continue;
      const a = placeholders(ref[k]).join(",");
      const b = placeholders(got[k]).join(",");
      if (a !== b) {
        problems.push(`${ns}: placeholders divergem em '${k}' (pt-BR: [${a}] vs [${b}])`);
      }
    }
  }

  if (problems.length > 0) {
    failures += 1;
    console.error(`\n✗ ${locale} — ${problems.length} problema(s):`);
    const MAX = 40;
    for (const p of problems.slice(0, MAX)) console.error(`   - ${p}`);
    if (problems.length > MAX) console.error(`   … +${problems.length - MAX}`);
  } else {
    console.log(`✓ ${locale} — em sync com ${REFERENCE} (${namespaces.length} namespaces)`);
  }
}

if (failures > 0) {
  console.error(
    `\n${failures} locale(s) fora de sync. pt-BR é a fonte: alinhe os JSONs (ver bin/scripts/check-locales.mjs).`,
  );
  process.exit(1);
}
console.log(`\nTodos os ${targets.length} locales em sync com ${REFERENCE}.`);
