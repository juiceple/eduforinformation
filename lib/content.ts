import { CLUSTERS, SUBJECTS } from "./clusters";
import { ITEMS1 } from "./items1";
import { ITEMS2 } from "./items2";
import type { Cluster, Item, SubjectId } from "./types";

export const ITEMS: Item[] = [...ITEMS1, ...ITEMS2].sort((a, b) => a.n - b.n);

const byNumber = new Map(ITEMS.map((it) => [it.n, it]));
const clusterById = new Map(CLUSTERS.map((c) => [c.id, c]));

export function getItem(n: number): Item | undefined {
  return byNumber.get(n);
}

export function getCluster(id: string): Cluster {
  const c = clusterById.get(id);
  if (!c) throw new Error(`unknown cluster ${id}`);
  return c;
}

export function subjectOf(n: number): SubjectId {
  const s = SUBJECTS.find((s) => n >= s.range[0] && n <= s.range[1]);
  return (s ? s.id : 3) as SubjectId;
}

export function itemsOfCluster(id: string): Item[] {
  return ITEMS.filter((it) => it.c === id);
}

export function itemsOfSubject(s: SubjectId): Item[] {
  return ITEMS.filter((it) => subjectOf(it.n) === s);
}

export const pad = (n: number) => String(n).padStart(3, "0");

export type Segment = { text: string; key: boolean };

/** "a [[b]] c" → [{a}, {b, key}, {c}] */
export function segments(line: string): Segment[] {
  const out: Segment[] = [];
  const re = /\[\[(.+?)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), key: false });
    out.push({ text: m[1], key: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), key: false });
  return out;
}

export const plain = (line: string) => line.replace(/\[\[(.+?)\]\]/g, "$1");

export function keywordsOf(it: Item): string[] {
  return it.p.flatMap((l) => segments(l).filter((s) => s.key).map((s) => s.text));
}

/** 빈칸 퀴즈가 가능한 항목(밑줄 키워드가 있는 항목) */
export const CLOZE_ITEMS = ITEMS.filter((it) => keywordsOf(it).length > 0);

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

/** 초성 힌트: "도착한 순서" → "ㄷㅊㅎ ㅅㅅ" (한글 외 문자는 첫 글자만 보이고 나머지는 •) */
export function chosung(text: string): string {
  let out = "";
  let prevAlnum = false;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      out += CHO[Math.floor((code - 0xac00) / 588)];
      prevAlnum = false;
    } else if (/[A-Za-z0-9]/.test(ch)) {
      out += prevAlnum ? "•" : ch;
      prevAlnum = true;
    } else {
      out += ch;
      prevAlnum = false;
    }
  }
  return out;
}

/** 채점용 정규화: 공백·문장부호 제거, 소문자 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s.,·:;'"“”‘’()\[\]{}<>!?~\-–—=]/g, "");
}

export function isCorrect(input: string, answer: string): boolean {
  const a = normalize(answer);
  const i = normalize(input);
  if (!i) return false;
  if (i === a) return true;
  // 긴 답은 핵심 부분을 70% 이상 포함하면 정답 처리
  return a.length >= 6 && a.includes(i) && i.length / a.length >= 0.7;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export { CLUSTERS, SUBJECTS };
