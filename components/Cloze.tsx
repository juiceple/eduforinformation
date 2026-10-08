"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chosung, CLOZE_ITEMS, getCluster, getItem, isCorrect, pad, segments, shuffle, subjectOf } from "@/lib/content";
import type { Grade } from "@/lib/progress";
import { useApp, type Scope } from "./AppContext";
import { RelatedChips } from "./ItemCard";
import ScopePicker from "./ScopePicker";
import { scopeItems, scopeLabel } from "./scope";

export default function Cloze({ initial }: { initial?: Scope }) {
  const { progress, ready, grade } = useApp();
  const [scope, setScope] = useState<Scope>(initial ?? { kind: "cluster", id: "os-process" });
  const [queue, setQueue] = useState<number[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [hints, setHints] = useState(false);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const firstInput = useRef<HTMLInputElement>(null);

  const start = useCallback(
    (s: Scope) => {
      setScope(s);
      const list = scopeItems(s, progress, CLOZE_ITEMS);
      // 묶음·과목 단위는 이야기 순서대로, 나머지는 섞어서
      const ordered = s.kind === "cluster" || s.kind === "subject" ? list : shuffle(list);
      setQueue(ordered.map((it) => it.n));
      setValues({});
      setChecked(false);
      setHints(false);
      setScore({ right: 0, total: 0 });
    },
    [progress],
  );

  useEffect(() => {
    if (ready && queue === null) start(scope);
  }, [ready, queue, scope, start]);

  const item = queue?.[0] !== undefined ? getItem(queue[0]) : undefined;

  useEffect(() => {
    firstInput.current?.focus();
  }, [item?.n]);

  if (!ready || queue === null) return null;

  const blanks = item
    ? item.p.flatMap((line, li) =>
        segments(line)
          .map((s, si) => ({ ...s, id: `${li}-${si}` }))
          .filter((s) => s.key),
      )
    : [];
  const results = blanks.map((b) => isCorrect(values[b.id] ?? "", b.text));
  const rightCount = results.filter(Boolean).length;

  const check = () => {
    if (!item) return;
    setChecked(true);
    setScore((s) => ({ right: s.right + rightCount, total: s.total + blanks.length }));
  };

  const next = (g: Grade) => {
    if (!item) return;
    grade(item.n, g);
    setQueue((q) => (q ? q.slice(1) : q));
    setValues({});
    setChecked(false);
    setHints(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const autoGrade: Grade = rightCount === blanks.length ? "good" : rightCount >= blanks.length / 2 ? "hard" : "again";
  let first = true;

  return (
    <>
      <h2 className="page-title">✍️ 빈칸 채우기</h2>
      <p className="page-sub">교재의 밑줄 핵심어가 빈칸입니다. 띄어쓰기는 채점에 영향 없어요. 막히면 초성 힌트를 켜세요.</p>
      <ScopePicker scope={scope} onChange={start} pool={CLOZE_ITEMS} />

      {!item ? (
        <div className="card empty">
          {score.total > 0 ? (
            <>
              <h3 style={{ marginBottom: 8 }}>🎉 {scopeLabel(scope)} 빈칸 완료!</h3>
              <p>정답률 {Math.round((score.right / score.total) * 100)}% ({score.right}/{score.total})</p>
            </>
          ) : (
            <h3>‘{scopeLabel(scope)}’에 빈칸 문제가 없어요. 다른 범위를 골라 보세요.</h3>
          )}
        </div>
      ) : (
        <>
          <div className="row small muted" style={{ marginBottom: 8 }}>
            <span>{scopeLabel(scope)} · 남은 항목 {queue.length}</span>
            <span className="spacer" />
            {score.total > 0 && <span>누적 정답 {score.right}/{score.total}</span>}
          </div>
          <article className="card">
            <div className="item-head">
              <span className={`num s${subjectOf(item.n)}`}>{pad(item.n)}</span>
              <h3>{item.t}</h3>
            </div>
            <span className="chip" style={{ marginBottom: 12 }}>
              {getCluster(item.c).emoji} {getCluster(item.c).name}
            </span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!checked) check();
              }}
              onKeyDown={(e) => {
                if (checked && e.key === "Enter") {
                  e.preventDefault();
                  next(autoGrade);
                }
              }}
            >
              <ul className="points" style={{ marginTop: 10 }}>
                {item.p.map((line, li) => (
                  <li key={li}>
                    {segments(line).map((s, si) => {
                      if (!s.key) return <span key={si}>{s.text}</span>;
                      const id = `${li}-${si}`;
                      const ok = isCorrect(values[id] ?? "", s.text);
                      const ref = first ? firstInput : undefined;
                      first = false;
                      return (
                        <span key={si}>
                          <input
                            ref={ref}
                            className={`cloze-input ${checked ? (ok ? "ok" : "ng") : ""}`}
                            style={{ width: `${Math.min(Math.max(s.text.length * 1.05 + 2, 5), 26)}em`, maxWidth: "100%" }}
                            value={values[id] ?? ""}
                            placeholder={hints ? chosung(s.text) : ""}
                            readOnly={checked}
                            autoComplete="off"
                            aria-label="빈칸"
                            onChange={(e) => setValues((v) => ({ ...v, [id]: e.target.value }))}
                          />
                          {checked && !ok && <span className="answer-tag">→ {s.text}</span>}
                        </span>
                      );
                    })}
                  </li>
                ))}
              </ul>
              {checked && item.ex && <div className="example">{item.ex}</div>}
              {checked && (
                <div className="hook">
                  <b>암기 훅</b> · {item.m}
                </div>
              )}
              {checked && <RelatedChips item={item} />}

              {!checked ? (
                <div className="row" style={{ marginTop: 16 }}>
                  <button type="button" className="btn sm" onClick={() => setHints((h) => !h)}>
                    {hints ? "초성 힌트 끄기" : "🔤 초성 힌트"}
                  </button>
                  <span className="spacer" />
                  <button type="button" className="btn" onClick={() => { setChecked(true); setScore((s) => ({ ...s, total: s.total + blanks.length })); }}>
                    모르겠어요
                  </button>
                  <button type="submit" className="btn primary">채점 (Enter)</button>
                </div>
              ) : (
                <>
                  <p style={{ marginTop: 16, fontWeight: 700 }}>
                    {rightCount}/{blanks.length} 정답{" "}
                    {rightCount === blanks.length ? "🎉" : ""}
                  </p>
                  <div className="grade-row">
                    <button type="button" className="btn bad" onClick={() => next("again")}>다시 볼래요</button>
                    <button type="button" className="btn warn" onClick={() => next("hard")}>애매해요</button>
                    <button type="button" className="btn good" onClick={() => next("good")}>외웠어요</button>
                  </div>
                  <p className="small muted" style={{ marginTop: 8 }}>
                    오타로 틀렸다면 ‘외웠어요’를 눌러도 됩니다. Enter는 채점 결과({autoGrade === "good" ? "외웠어요" : autoGrade === "hard" ? "애매해요" : "다시 볼래요"})로 넘어갑니다.
                  </p>
                </>
              )}
            </form>
          </article>
        </>
      )}
    </>
  );
}
