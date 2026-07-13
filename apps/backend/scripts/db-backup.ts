/**
 * Backup lógico do banco (pg_dump -Fc) — fase pre-production (P-3).
 *
 * Uso: `pnpm --filter backend db:backup` (lê DATABASE_URL do .env).
 * Saída: `backups/larmony-<db>-<timestamp>.dump` (formato custom, restaurável
 * com pg_restore). A pasta `backups/` fica fora do git (dumps contêm PII —
 * armazenamento off-site é decisão manual, ver docs/backup-restore.md).
 *
 * Dois modos:
 *  1. `pg_dump` no PATH (client tools instaladas — staging/prod/CI);
 *  2. fallback local: `docker exec` no container do Supabase local
 *     (SUPABASE_DB_CONTAINER, default supabase_db_larmony) — cobre dev
 *     Windows sem postgres client tools.
 */
import "dotenv/config";
import { spawnSync, spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";

const DATABASE_URL = process.env["DATABASE_URL"];
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida (apps/backend/.env).");
  process.exit(1);
}

const url = new URL(DATABASE_URL);
const dbName = url.pathname.replace(/^\//, "") || "postgres";
const stamp = new Date()
  .toISOString()
  .replace(/[:T]/g, "-")
  .replace(/\..+/, "");
const outDir = path.resolve(process.cwd(), "backups");
const outFile = path.join(outDir, `larmony-${dbName}-${stamp}.dump`);
mkdirSync(outDir, { recursive: true });

function hasPgDump(): boolean {
  const probe = spawnSync("pg_dump", ["--version"], { stdio: "ignore", shell: false });
  return probe.status === 0;
}

async function run(): Promise<void> {
  if (hasPgDump()) {
    console.log(`pg_dump (host) → ${outFile}`);
    const res = spawnSync(
      "pg_dump",
      ["-Fc", "--no-owner", "-d", DATABASE_URL!, "-f", outFile],
      { stdio: "inherit" },
    );
    process.exit(res.status ?? 1);
  }

  // Fallback: pg_dump dentro do container do Supabase local (stdout → arquivo).
  const container = process.env["SUPABASE_DB_CONTAINER"] ?? "supabase_db_larmony";
  console.log(`pg_dump ausente no PATH — usando docker exec ${container} → ${outFile}`);
  const child = spawn(
    "docker",
    ["exec", container, "pg_dump", "-Fc", "--no-owner", "-U", url.username || "postgres", "-d", dbName],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  const out = createWriteStream(outFile);
  child.stdout.pipe(out);
  child.on("close", (code) => {
    if (code === 0) {
      console.log(`✓ Backup gerado: ${outFile}`);
    } else {
      console.error(`✗ pg_dump falhou (exit ${code}).`);
    }
    process.exit(code ?? 1);
  });
}

void run();
