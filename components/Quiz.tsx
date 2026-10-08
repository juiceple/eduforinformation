"use client";

import { useCallback, useEffect, useState } from "react";
import { getItem, ITEMS, pad, plain, shuffle, subjectOf } from "@/lib/content";
import { isDue } from "@/lib/progress";
import type { Item } from "@/lib/types";
import { useApp, type Scope } from "./AppContext";
import ItemCard from "./ItemCard";
import ScopePicker from "./ScopePicker";
import { scopeItems, scopeLabel } from "./scope";

const ROUND = 10;

interface Question {
  n: number;
  kind: "def2title" | "title2def";
  prompt: string;
  options: string[];
  answer: number;
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/** 같은 묶음 → 같은 과목 순으로 헷갈리기 좋은 오답 후보를 고른다 */
function neighbours(item: Item): Item[] {
  const sameCluster = shuffle(ITEMS.filter((it) => it.c === item.c && it.n !== item.n));
  const sameSubject = shuffle(ITEMS.filter((it) => it.c !== item.c && subjectOf(it.n) === subjectOf(item.n)));
  return [...sameCluster, ...sameSubject];
}

/**
 * 문제로 낼 설명 한 줄. 나열형 항목(짧은 줄들)은 한 줄만 떼면 다른 항목과 헷갈리므로
 * 목록 전체를 이어서 하나의 설명으로 쓴다.
 */
function describe(item: Item): string {
  const lines = item.p.map(plain);
  const long = lines.filter((l) => l.length >= 18);
  if (long.length) return pick(long);
  return lines.join(" / ");
}

function makeQuestion(item: Item): Question {
  const kind: Question["kind"] = Math.random() < 0.5 ? "def2title" : "title2def";
  if (kind === "def2title") {
    const titles = [item.t];
    for (const it of neighbours(item)) {
      if (titles.length >= 4) break;
      if (!titles.includes(it.t)) titles.push(it.t);
    }
    const options = shuffle(titles);
    return { n: item.n, kind, prompt: describe(item), options, answer: options.indexOf(item.t) };
  }
  const right = describe(item);
  const lines = [right];
  for (const it of neighbours(item)) {
    if (lines.length >= 4) break;
    const l = describe(it);
    if (!lines.includes(l) && !item.p.map(plain).includes(l)) lines.push(l);
  }
  const options = shuffle(lines);
  return { n: item.n, kind, prompt: item.t, options, answer: options.indexOf(right) };
}

export default function Quiz({ initial }: { initial?: Scope }) {
  const { progress, ready, grade } = useApp();
  const [scope, setScope] = useState<Scope>(initial ?? { kind: "all" });
  const [qs, setQs] = useState<Question[] | null>(null);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [wrongs, setWrongs] = useState<number[]>([]);

  const start = useCallback(
    (s: Scope) => {
      setScope(s);
      setQs(shuffle(scopeItems(s, progress)).slice(0, ROUND).map(makeQuestion));
      setI(0);
      setChosen(null);
      setRight(0);
      setWrongs([]);
    },
    [progress],
  );

  useEffect(() => {
    if (ready && qs === null) start(scope);
  }, [ready, qs, scope, start]);

  if (!ready || qs === null) return null;
  const q = qs[i];

  const choose = (k: number) => {
    if (chosen !== null || !q) return;
    setChosen(k);
    const st = progress.map[q.n];
    if (k === q.answer) {
      setRight((r) => r + 1);
      // 새 항목이거나 복습일이 된 항목만 단계를 올린다
      if (!st || isDue(st)) grade(q.n, "good");
    } else {
      setWrongs((w) => [...w, q.n]);
      grade(q.n, "again");
    }
  };

  return (
    <>
      <h2 className="page-title">🎯 객관식</h2>
      <p className="page-sub">설명 → 개념 이름, 개념 이름 → 옳은 설명을 섞어 {ROUND}문제씩. 오답은 같은 묶음에서 골라서 헷갈리게 냅니다.</p>
      <ScopePicker scope={scope} onChange={start} />

      {!q ? (
        <div className="card">
          {qs.length === 0 ? (
            <p className="empty">‘{scopeLabel(scope)}’에 해당하는 항목이 없어요. 다른 범위를 골라 보세요.</p>
          ) : (
            <>
              <h3 style={{ marginBottom: 8 }}>
                결과: {right}/{qs.length} {right === qs.length ? "🏆" : right >= qs.length * 0.6 ? "👍" : "💪"}
              </h3>
              <p className="muted" style={{ marginBottom: 12 }}>
                {right >= qs.length * 0.6 ? "합격선(60%) 이상입니다." : "틀린 항목은 ‘약점’ 범위에 모였어요. 카드로 한 번 더 보세요."}
              </p>
              {wrongs.length > 0 && (
                <div className="grid" style={{ marginBottom: 12 }}>
                  <p style={{ fontWeight: 700 }}>틀린 항목 다시 보기</p>
                  {[...new Set(wrongs)].map((n) => {
                    const it = getItem(n);
                    return it ? <ItemCard key={n} item={it} /> : null;
                  })}
                </div>
              )}
              <button className="btn primary" onClick={() => start(scope)}>새 {ROUND}문제</button>
            </>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="row small muted" style={{ marginBottom: 10 }}>
            <span>
              {i + 1} / {qs.length}
            </span>
            <span className="spacer" />
            <span>정답 {right}</span>
          </div>
          {q.kind === "def2title" ? (
            <>
              <p className="muted small">다음 설명에 해당하는 것은?</p>
              <p style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>“{q.prompt}”</p>
            </>
          ) : (
            <>
              <p className="muted small">다음 중 아래 개념에 대한 설명으로 옳은 것은?</p>
              <p style={{ fontSize: 19, fontWeight: 800, marginTop: 6 }}>{q.prompt}</p>
            </>
          )}
          <div className="options">
            {q.options.map((o, k) => {
              const cls = chosen === null ? "" : k === q.answer ? "correct" : k === chosen ? "wrong" : "";
              return (
                <button key={k} className={`option ${cls}`} disabled={chosen !== null} onClick={() => choose(k)}>
                  <span className="o-num">{"①②③④"[k]}</span>
                  <span>{o}</span>
                </button>
              );
            })}
          </div>
          {chosen !== null && (
            <>
              <p style={{ marginTop: 14, fontWeight: 700, color: chosen === q.answer ? "var(--good)" : "var(--bad)" }}>
                {chosen === q.answer ? "정답!" : `오답 — 정답은 ${"①②③④"[q.answer]}`} · {pad(q.n)} {getItem(q.n)?.t}
              </p>
              {chosen !== q.answer && (
                <div className="hook">
                  <b>암기 훅</b> · {getItem(q.n)?.m}
                </div>
              )}
              <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
                <button
                  className="btn primary"
                  autoFocus
                  onClick={() => {
                    setI((x) => x + 1);
                    setChosen(null);
                  }}
                >
                  {i + 1 < qs.length ? "다음 문제 →" : "결과 보기"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
