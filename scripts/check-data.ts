// 데이터 무결성 검사: npx tsx 없이 Node 22의 타입 제거 기능으로 실행
import { CLUSTERS } from "../lib/clusters.ts";
import { ITEMS1 } from "../lib/items1.ts";
import { ITEMS2 } from "../lib/items2.ts";
import { EXAM, EXAM_SETS, isCorrect } from "../lib/exam.ts";

const items = [...ITEMS1, ...ITEMS2];
const errors: string[] = [];
const nums = new Set(items.map((i) => i.n));
for (let n = 1; n <= 200; n++) if (!nums.has(n)) errors.push(`missing item ${n}`);
if (items.length !== 200) errors.push(`expected 200 items, got ${items.length}`);
const cids = new Set(CLUSTERS.map((c) => c.id));
for (const it of items) {
  if (!cids.has(it.c)) errors.push(`${it.n}: unknown cluster ${it.c}`);
  for (const r of it.r) {
    if (!nums.has(r)) errors.push(`${it.n}: bad related ${r}`);
    if (r === it.n) errors.push(`${it.n}: self link`);
  }
  for (const l of it.p) {
    if ((l.match(/\[\[/g) ?? []).length !== (l.match(/\]\]/g) ?? []).length) errors.push(`${it.n}: unbalanced [[ ]]`);
  }
  if (!it.m) errors.push(`${it.n}: no mnemonic`);
}
for (const c of CLUSTERS) if (!items.some((i) => i.c === c.id)) errors.push(`empty cluster ${c.id}`);
const blanks = items.reduce((s, it) => s + it.p.join("").split("[[").length - 1, 0);
// 실기 요약 테스트: id 중복, 범위, 인정 답안이 스스로 채점을 통과하는지
const examIds = new Set<string>();
for (const q of EXAM) {
  if (examIds.has(q.id)) errors.push(`exam ${q.id}: duplicate id`);
  examIds.add(q.id);
  if (!EXAM_SETS.some((s) => s.id === q.set)) errors.push(`exam ${q.id}: unknown set ${q.set}`);
  if (!q.a.length) errors.push(`exam ${q.id}: no answer`);
  for (const a of q.a) if (!isCorrect(q, a)) errors.push(`exam ${q.id}: answer "${a}" fails its own check`);
}
for (const s of EXAM_SETS) if (!EXAM.some((q) => q.set === s.id)) errors.push(`exam set ${s.id} is empty`);
console.log(`exam=${EXAM.length}`);
console.log(`items=${items.length} clusters=${CLUSTERS.length} blanks=${blanks}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("data OK");
