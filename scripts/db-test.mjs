// Runs supabase/tests/security.sql inside the local Supabase Postgres container.   npm run db:test
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/tests/security.sql", import.meta.url));
const r = spawnSync("docker", ["exec", "-i", "supabase_db_portal", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A"], { input: sql, encoding: "utf8" });

const lines = `${r.stdout}\n${r.stderr}`.split("\n").map((l) => l.replace(/^NOTICE:\s+/, "").trim());
for (const l of lines) if (/^ok |FAIL|ERROR|PASSED/.test(l)) console.log(l);
if (r.status !== 0) {
  console.error("\nSecurity tests failed. Is `npm run db:start` running and the database reset?");
  process.exit(1);
}
