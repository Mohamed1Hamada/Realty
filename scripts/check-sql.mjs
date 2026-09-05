/**
 * فحص صياغة ملفات SQL باستخدام parser الخاص بـ PostgreSQL نفسه (libpg-query).
 * ملاحظة: الكود داخل كتل DO $$ ... $$ (plpgsql) لا يفحصه الـ parser لأنه نص.
 *
 * الاستخدام: node scripts/check-sql.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "libpg-query";

const parse = pg.parseQuerySync ?? pg.parse;

const files = ["supabase/schema.sql", "supabase/relations.sql", "supabase/seed.sql"];
let failed = false;

for (const file of files) {
  const sql = readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), "utf8");
  try {
    const result = await parse(sql);
    const count = (result.stmts ?? []).length;
    console.log(`✅ ${file} — ${count} جملة SQL صحيحة`);
  } catch (err) {
    failed = true;
    console.error(`❌ ${file}`);
    console.error(`   ${err.message}`);
    if (err.cursorPosition) console.error(`   الموضع: ${err.cursorPosition}`);
  }
}

process.exit(failed ? 1 : 0);
