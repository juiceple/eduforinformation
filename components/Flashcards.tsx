"use client";

import { useCallback, useEffect, useState } from "react";
import { getCluster, getItem, pad, shuffle, subjectOf } from "@/lib/content";
import type { Grade } from "@/lib/progress";
import { useApp, type Scope } from "./AppContext";
import ItemCard from "./ItemCard";
import ScopePicker from "./ScopePicker";
import { scopeItems, scopeLabel } from "./scope";

export default function Flashcards({ initial }: { initial?: Scope }) {
  const { progress, ready, grade } = useApp();
  const [scope, setScope] = useState<Scope>(initial ?? { kind: "due" });
  const [queue, setQueue] = useState<number[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [hint, setHint] = useState(false);
  const [done, setDone] = useState({ good: 0, hard: 0, again: 0 });

  const start = useCallback(
    (s: Scope) => {
      setScope(s);
      setQueue(shuffle(scopeItems(s, progress)).map((it) => it.n));
      setFlipped(false);
      setHint(false);
      setDone({ good: 0, hard: 0, again: 0 });
    },
    [progress],
  );

  useEffect(() => {
    if (ready && queue === null) start(scope);
  }, [ready, queue, scope, start]);

  const current = queue?.[0];
  const item = current !== undefined ? getItem(current) : undefined;

  const answer = useCallback(
    (g: Grade) => {
      if (current === undefined) return;
      grade(current, g);
      setDone((d) => ({ ...d, [g]: d[g] + 1 }));
      setQueue((q) => {
        if (!q) return q;
        const rest = q.slice(1);
        // 몰랐던 카드는 이번 세션 안에서 몇 장 뒤에 한 번 더
        if (g === "again") rest.splice(Math.min(3, rest.length), 0, current);
        return rest;
      });
      setFlipped(false);
      setHint(false);
    },
    [current, grade],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && e.key === "1") answer("again");
      else if (flipped && e.key === "2") answer("hard");
      else if (flipped && e.key === "3") answer("good");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, answer]);

  const total = done.good + done.hard + done.again;

  return (
    <>
      <h2 className="page-title">🃏 플래시카드</h2>
      <p className="page-sub">제목만 보고 내용을 소리 내어 떠올린 다음 뒤집어 확인하세요. Space 뒤집기 · 1 몰라요 · 2 애매 · 3 외웠어요</p>
      <ScopePicker scope={scope} onChange={start} />

      {!ready || queue === null ? null : !item ? (
        <div className="card empty">
          {total > 0 ? (
            <>
              <h3 style={{ marginBottom: 8 }}>🎉 {scopeLabel(scope)} 완료!</h3>
              <p>외웠어요 {done.good} · 애매 {done.hard} · 몰라요 {done.again}</p>
            </>
          ) : (
            <>
              <h3 style={{ marginBottom: 8 }}>‘{scopeLabel(scope)}’에 해당하는 카드가 없어요</h3>
              <p>{scope.kind === "due" ? "오늘 복습할 카드가 없습니다. ‘새 항목’이나 과목을 골라 보세요." : "다른 범위를 골라 보세요."}</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="row small muted" style={{ marginBottom: 8 }}>
            <span>{scopeLabel(scope)} · 남은 카드 {queue.length}</span>
            <span className="spacer" />
            <span>✅ {done.good} · 🤔 {done.hard} · ❌ {done.again}</span>
          </div>
          {!flipped ? (
            <div className="card flash">
              <div className="flash-front">
                <span className={`num s${subjectOf(item.n)}`}>{pad(item.n)}</span>
                <span className="chip">
                  {getCluster(item.c).emoji} {getCluster(item.c).name}
                </span>
                <h2>{item.t}</h2>
                <p className="muted">떠올릴 내용: {item.p.length}가지{item.ex ? " + 예제" : ""}</p>
                {hint ? (
                  <div className="hook" style={{ textAlign: "left", maxWidth: 560 }}>
                    <b>힌트</b> · {item.m}
                  </div>
                ) : (
                  <button className="btn sm" onClick={() => setHint(true)}>💡 암기 훅 힌트</button>
                )}
              </div>
              <button className="btn primary" onClick={() => setFlipped(true)}>
                뒤집기 <span className="kbd">Space</span>
              </button>
            </div>
          ) : (
            <>
              <ItemCard key={item.n} item={item} />
              <div className="grade-row">
                <button className="btn bad" onClick={() => answer("again")}>
                  몰라요 <span className="kbd">1</span>
                </button>
                <button className="btn warn" onClick={() => answer("hard")}>
                  애매해요 <span className="kbd">2</span>
                </button>
                <button className="btn good" onClick={() => answer("good")}>
                  외웠어요 <span className="kbd">3</span>
                </button>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
