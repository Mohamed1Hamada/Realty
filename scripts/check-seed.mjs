/**
 * فحص ثابت لملف seed.sql — لأن كود plpgsql داخل DO $$ ... $$ لا يفحصه
 * parser الخاص بـ PostgreSQL، بنعمل فحص بسيط يمسك الأخطاء الشائعة:
 *   1. متغير مستخدم بدون إعلان في DECLARE
 *   2. صفوف المصفوفات مش متساوية الطول (بيسبب خطأ وقت التشغيل)
 *
 * الاستخدام: node scripts/check-seed.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sql = readFileSync(
  fileURLToPath(new URL("../supabase/seed.sql", import.meta.url)),
  "utf8",
);

const problems = [];

// 1) المتغيرات المعلنة مقابل المستخدمة
const declareBlock = sql.match(/declare([\s\S]*?)\nbegin/i)?.[1] ?? "";
const declared = new Set(
  [...declareBlock.matchAll(/^\s*(v_\w+)\s/gm)].map((m) => m[1]),
);
const body = sql.slice(sql.search(/\nbegin\b/i));
const used = new Set([...body.matchAll(/\b(v_\w+)\b/g)].map((m) => m[1]));

for (const name of used) {
  if (!declared.has(name)) problems.push(`متغير غير مُعلن: ${name}`);
}

// 2) طول صفوف المصفوفات الثنائية
function rowsOf(name) {
  const block = sql.match(
    new RegExp(
      `${name}\\s+text\\[\\]\\[\\]\\s*:=\\s*array\\[([\\s\\S]*?)\\n\\s*\\];`,
    ),
  )?.[1];
  if (!block) return null;
  return [...block.matchAll(/\[((?:'(?:[^']|'')*'|[^'[\]])*)\]/g)].map((m) =>
    m[1]
      .split(/','/)
      .map((s) => s.replace(/^'|'$/g, "")),
  );
}

const matrices = {
  v_clients: 6,
  v_contracts: 9,
  v_expenses: 3,
};

for (const [name, expected] of Object.entries(matrices)) {
  const rows = rowsOf(name);
  if (!rows) {
    problems.push(`مصفوفة مفقودة أو بتنسيق غير متوقع: ${name}`);
    continue;
  }
  rows.forEach((row, i) => {
    if (row.length !== expected) {
      problems.push(
        `${name}[${i + 1}] فيها ${row.length} عنصر والمفروض ${expected}`,
      );
    }
  });
  console.log(`   ${name}: ${rows.length} صف × ${expected} عمود`);
}

// 3) مصفوفات المناطق: المحافظات والمناطق لازم يكونوا بنفس الطول
function flatLength(name) {
  const m = sql.match(new RegExp(`${name}\\s+text\\[\\]\\s*:=\\s*array\\[([^\\]]*)\\]`));
  return m ? m[1].split(",").length : null;
}

const govLen = flatLength("v_govs");
const disLen = flatLength("v_distr");
if (govLen !== disLen) {
  problems.push(`v_govs (${govLen}) و v_distr (${disLen}) مش نفس الطول`);
} else {
  console.log(`   v_govs / v_distr: ${govLen} منطقة`);
}

if (problems.length) {
  console.error("\n❌ مشاكل في seed.sql:");
  problems.forEach((p) => console.error(`   - ${p}`));
  process.exit(1);
}

console.log(`\n✅ seed.sql سليم — ${declared.size} متغير مُعلن، كل المتغيرات المستخدمة معرّفة`);
