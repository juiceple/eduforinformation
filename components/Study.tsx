"use client";

import { useMemo, useState } from "react";
import { getCluster, getItem, itemsOfCluster, itemsOfSubject, segments, shuffle } from "@/lib/content";
import type { HistoryApi } from "@/lib/history";
import type { Item } from "@/lib/types";

type Mode = "flash" | "cloze" | "quiz";

const MODES: { id: Mode; label: string }[] = [
  { id: "flash", label: "플래시카드" },
  { id: "cloze", label: "빈칸채우기" },
  { id: "quiz", label: "객관식" },
];

export default function Study({
  n,
  done,
  markDone,
  openItem,
  back,
  logAttempt,
}: {
  n: number;
  done: Record<number, boolean>;
  markDone: (n: number, known: boolean) => void;
  openItem: (n: number) => void;
  back: () => void;
  logAttempt: HistoryApi["log"];
}) {
  const [mode, setMode] = useState<Mode>("flash");
  const item = getItem(n)!;
  const cluster = getCluster(item.c);
  const items = itemsOfCluster(cluster.id);
  const idx = items.findIndex((it) => it.n === n);
  const prev = items[idx - 1];
  const next = items[idx + 1];
  const state = done[n];
  const related = item.r.map(getItem).filter((it): it is Item => !!it);

  return (
    <div className="screen">
      <button className="back" onClick={back}>
        ← {cluster.name}
      </button>

      <div className="chips study">
        {items.map((it) => (
          <button
            key={it.n}
            className={`chip ${it.n === n ? "active" : done[it.n] ? "done" : ""}`}
            onClick={() => openItem(it.n)}
            title={it.t}
            aria-current={it.n === n ? "true" : undefined}
          >
            {it.n}
          </button>
        ))}
      </div>

      <div className="study-bar">
        <div className="modes" role="tablist">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              className={`mode ${mode === m.id ? "active" : ""}`}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="counter">
          {idx + 1} / {items.length}
        </div>
      </div>

      <div className="panel">
        {/* 항목이나 모드가 바뀌면 카드 뒤집기·빈칸·힌트·객관식 상태를 새로 시작 */}
        {mode === "flash" && <Flash key={n} item={item} />}
        {mode === "cloze" && <Cloze key={n} item={item} />}
        {mode === "quiz" && <Quiz key={n} item={item} logAttempt={logAttempt} />}
      </div>

      <div className="study-foot">
        <div className="row">
          {prev && (
            <button className="nav-btn" onClick={() => openItem(prev.n)}>
              ← 이전
            </button>
          )}
          {next && (
            <button className="nav-btn" onClick={() => openItem(next.n)}>
              다음 →
            </button>
          )}
        </div>
        <div className="row">
          <button className={`mark know ${state === true ? "on" : ""}`} onClick={() => markDone(n, true)} aria-pressed={state === true}>
            👍 알아요
          </button>
          <button className={`mark again ${state === false ? "on" : ""}`} onClick={() => markDone(n, false)} aria-pressed={state === false}>
            🔁 다시 볼게요
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <div className="related">
          <div className="related-label">🔗 연결해서 보기</div>
          <div className="related-list">
            {related.map((it) => (
              <button key={it.n} className="related-chip" onClick={() => openItem(it.n)}>
                {it.n}. {it.t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Lines({ item, hidden, onReveal, cloze }: { item: Item; hidden?: (key: string) => boolean; onReveal?: (key: string) => void; cloze?: boolean }) {
  return (
    <ul className={`lines ${cloze ? "cloze" : ""}`}>
      {item.p.map((line, li) => {
        let bi = 0;
        return (
          <li key={li}>
            <span>
              {segments(line).map((s, si) => {
                if (!s.key) return <span key={si}>{s.text}</span>;
                const key = `${li}-${bi++}`;
                if (hidden?.(key))
                  return (
                    <button key={si} className="blank" onClick={() => onReveal?.(key)} aria-label="빈칸 — 눌러서 보기">
                      {s.text}
                    </button>
                  );
                return (
                  <span key={si} className="kw">
                    {s.text}
                  </span>
                );
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Flash({ item }: { item: Item }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      className="flash"
      role="button"
      tabIndex={0}
      aria-expanded={flipped}
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
    >
      {!flipped ? (
        <div className="flash-front">
          <div className="flash-no">No. {item.n}</div>
          <div className="flash-title serif">{item.t}</div>
          <div className="flash-tap">탭해서 내용 보기 →</div>
        </div>
      ) : (
        <div>
          <h2 className="item-title serif">{item.t}</h2>
          <Lines item={item} />
          {item.ex && <div className="example">{item.ex}</div>}
          <div className="hook">
            <b>💡 암기 훅&nbsp; </b>
            {item.m}
          </div>
        </div>
      )}
    </div>
  );
}

function Cloze({ item }: { item: Item }) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [hintOpen, setHintOpen] = useState(false);

  const toggle = (key: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const revealAll = () => {
    const all = new Set<string>();
    item.p.forEach((line, li) => segments(line).filter((s) => s.key).forEach((_, bi) => all.add(`${li}-${bi}`)));
    setRevealed(all);
  };

  return (
    <div>
      <div className="cloze-head">
        <h2 className="item-title serif">{item.t}</h2>
        <button className="link" onClick={revealAll}>
          전체 보기
        </button>
      </div>
      <Lines item={item} cloze hidden={(k) => !revealed.has(k)} onReveal={toggle} />
      <button className="hint-toggle" onClick={() => setHintOpen((o) => !o)} aria-expanded={hintOpen}>
        {hintOpen ? "🔽 암기 힌트 숨기기" : "▶️ 암기 힌트 보기"}
      </button>
      {hintOpen && <div className="hook">{item.m}</div>}
    </div>
  );
}

interface BlankQuiz {
  li: number;
  bi: number;
  answer: string;
  choices: string[];
}

/** 밑줄 키워드가 있는 첫 줄에서 하나를 가리고, 같은 과목의 다른 키워드 3개를 오답으로 섞는다. */
function makeQuiz(item: Item): BlankQuiz | null {
  const li = item.p.findIndex((line) => segments(line).some((s) => s.key));
  if (li < 0) return null;
  const blanks = segments(item.p[li]).filter((s) => s.key);
  const bi = Math.floor(Math.random() * blanks.length);
  const answer = blanks[bi].text;
  const pool = new Set<string>();
  for (const it of itemsOfSubject(getCluster(item.c).subject))
    for (const line of it.p) for (const s of segments(line)) if (s.key && s.text !== answer) pool.add(s.text);
  const choices = shuffle([answer, ...shuffle([...pool]).slice(0, 3)]);
  return { li, bi, answer, choices };
}

function Quiz({ item, logAttempt }: { item: Item; logAttempt: HistoryApi["log"] }) {
  const quiz = useMemo(() => makeQuiz(item), [item]);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <h2 className="quiz-q serif">No. {item.n} — 빈칸에 들어갈 말은?</h2>
      {!quiz ? (
        <div className="quiz-none">이 항목은 객관식 문제를 만들 수 없어요. 플래시카드로 학습해보세요.</div>
      ) : (
        <>
          <div className="quiz-line">
            {(() => {
              let bi = 0;
              return segments(item.p[quiz.li]).map((s, si) => {
                if (!s.key) return <span key={si}>{s.text}</span>;
                if (bi++ !== quiz.bi) return <span key={si} className="kw">{s.text}</span>;
                if (!selected) return <span key={si} className="q-mask">?????</span>;
                return (
                  <span key={si} className={selected === quiz.answer ? "q-right" : "q-wrong"}>
                    {s.text}
                  </span>
                );
              });
            })()}
          </div>
          <div className="choices">
            {quiz.choices.map((c) => {
              const cls = !selected ? "" : c === quiz.answer ? "correct" : c === selected ? "wrong" : "dim";
              return (
                <button
                  key={c}
                  className={`choice ${cls}`}
                  disabled={!!selected}
                  onClick={() => {
                    setSelected(c);
                    logAttempt({ key: `quiz:${item.n}`, input: c, right: c === quiz.answer, li: quiz.li, answer: quiz.answer });
                  }}
                >
                  {c}
                  {cls === "correct" && " ✓"}
                  {cls === "wrong" && " ✗"}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
