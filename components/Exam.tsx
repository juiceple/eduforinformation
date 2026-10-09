"use client";

import { useEffect, useRef, useState } from "react";
import { shuffle } from "@/lib/content";
import { answerOf, EXAM, EXAM_SETS, isCorrect } from "@/lib/exam";
import type { HistoryApi } from "@/lib/history";
import type { ExamQ, ExamSet } from "@/lib/types";

/** 실기 요약 테스트 기록. 기존 200문항 진행률(edu-info-progress-v1)과 섞이지 않게 따로 이 브라우저에만 둔다. */
const STORAGE_KEY = "edu-info-exam-v1";

interface ExamRecord {
  /** 마지막으로 틀린 문제 id (맞히면 빠진다) */
  wrong: string[];
  /** 범위별 마지막 점수 */
  last: Record<string, { right: number; total: number }>;
}

function load(): ExamRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const r = JSON.parse(raw) as Partial<ExamRecord>;
      return { wrong: r.wrong ?? [], last: r.last ?? {} };
    }
  } catch {}
  return { wrong: [], last: {} };
}

function save(r: ExamRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  } catch {}
}

type Scope = "all" | `${ExamSet}` | "wrong";
type Count = 10 | 20 | 0;

interface Answer {
  input: string;
  right: boolean;
}

export default function Exam({
  goHome,
  openWrongNote,
  history,
  retry,
}: {
  goHome: () => void;
  openWrongNote: () => void;
  history: Pick<HistoryApi, "log" | "fixLast">;
  /** 오답노트에서 ‘다시 풀기’로 들어오면 이 문제들로 바로 시작 */
  retry?: string[];
}) {
  const [record, setRecord] = useState<ExamRecord>({ wrong: [], last: {} });
  const [scope, setScope] = useState<Scope>("all");
  const [count, setCount] = useState<Count>(20);
  const [shuffled, setShuffled] = useState(true);
  const [questions, setQuestions] = useState<ExamQ[] | null>(null);
  const [runScope, setRunScope] = useState<Scope>("all");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => setRecord(load()), []);

  useEffect(() => {
    if (!retry?.length) return;
    const list = EXAM.filter((q) => retry.includes(q.id));
    if (!list.length) return;
    setRunScope("wrong");
    setQuestions(shuffle(list));
    setAnswers([]);
    setIdx(0);
  }, [retry]);

  const update = (fn: (r: ExamRecord) => ExamRecord) =>
    setRecord((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });

  const pool = (s: Scope) =>
    s === "all" ? EXAM : s === "wrong" ? EXAM.filter((q) => record.wrong.includes(q.id)) : EXAM.filter((q) => String(q.set) === s);

  const start = (s: Scope, list?: ExamQ[]) => {
    let qs = list ?? pool(s);
    if (shuffled) qs = shuffle(qs);
    if (!list && count) qs = qs.slice(0, count);
    if (!qs.length) return;
    setRunScope(s);
    setQuestions(qs);
    setAnswers([]);
    setIdx(0);
    window.scrollTo({ top: 0 });
  };

  const submit = (q: ExamQ, input: string, right: boolean) => {
    // 이미 채점한 문제를 ‘맞게 썼어요’로 고치면 새 기록 대신 마지막 기록을 고친다
    if (answers[idx]) history.fixLast(`exam:${q.id}`);
    else history.log({ key: `exam:${q.id}`, input, right });
    setAnswers((a) => {
      const next = a.slice();
      next[idx] = { input, right };
      return next;
    });
    update((r) => {
      const wrong = r.wrong.filter((id) => id !== q.id);
      if (!right) wrong.push(q.id);
      return { ...r, wrong };
    });
  };

  const finish = () => {
    if (!questions) return;
    const right = answers.filter((a) => a?.right).length;
    update((r) => ({ ...r, last: { ...r.last, [runScope]: { right, total: questions.length } } }));
    setIdx(questions.length);
    window.scrollTo({ top: 0 });
  };

  // ── 설정 화면 ──
  if (!questions) {
    const scopes: { id: Scope; label: string; emoji: string; n: number }[] = [
      { id: "all", label: "전체", emoji: "📚", n: EXAM.length },
      ...EXAM_SETS.map((s) => ({ id: `${s.id}` as Scope, label: s.name, emoji: s.emoji, n: pool(`${s.id}` as Scope).length })),
      { id: "wrong", label: "틀린 문제만", emoji: "🔁", n: pool("wrong").length },
    ];
    const n = pool(scope).length;
    return (
      <div className="screen">
        <button className="back" onClick={goHome}>
          ← 홈
        </button>
        <h1 className="screen-title serif">📝 실기 요약 테스트</h1>
        <p className="exam-lead">
          실기 총요약 노트 (1)~(3)으로 만든 단답형 {EXAM.length}문제예요. 기존 200문항 학습과는 따로 기록돼요.
        </p>

        <div className="exam-label">범위</div>
        <div className="exam-scopes">
          {scopes.map((s) => {
            const last = record.last[s.id];
            return (
              <button
                key={s.id}
                className={`exam-scope ${scope === s.id ? "on" : ""}`}
                onClick={() => setScope(s.id)}
                disabled={s.n === 0}
                aria-pressed={scope === s.id}
              >
                <span className="exam-scope-emoji">{s.emoji}</span>
                <span className="exam-scope-name">{s.label}</span>
                <span className="exam-scope-meta">
                  {s.n}문제{last ? ` · 지난번 ${last.right}/${last.total}` : ""}
                </span>
              </button>
            );
          })}
        </div>

        <div className="exam-label">문제 수</div>
        <div className="modes">
          {([10, 20, 0] as Count[]).map((c) => (
            <button key={c} className={`mode ${count === c ? "active" : ""}`} onClick={() => setCount(c)} aria-pressed={count === c}>
              {c ? `${c}문제` : "전부"}
            </button>
          ))}
        </div>

        <label className="exam-check">
          <input type="checkbox" checked={shuffled} onChange={(e) => setShuffled(e.target.checked)} /> 순서 섞기
        </label>

        <button className="exam-start" onClick={() => start(scope)} disabled={n === 0}>
          시작하기 · {count ? Math.min(count, n) : n}문제
        </button>
        <button className="nav-btn exam-note-link" onClick={openWrongNote}>
          📒 오답노트 보기
        </button>
      </div>
    );
  }

  // ── 결과 화면 ──
  if (idx >= questions.length) {
    const right = answers.filter((a) => a?.right).length;
    const missed = questions.filter((_, i) => !answers[i]?.right);
    const pct = Math.round((right / questions.length) * 100);
    return (
      <div className="screen">
        <button className="back" onClick={() => setQuestions(null)}>
          ← 테스트 설정
        </button>
        <div className="panel exam-result">
          <div className="exam-score serif">
            {right} / {questions.length}
          </div>
          <div className="exam-score-sub">
            {pct}점 · {pct >= 60 ? "합격선(60점) 통과 🎉" : "합격선은 60점이에요. 틀린 문제를 다시 풀어봐요"}
          </div>
          <div className="row exam-result-actions">
            {missed.length > 0 && (
              <button className="exam-start" onClick={() => start("wrong", missed)}>
                틀린 {missed.length}문제 다시 풀기
              </button>
            )}
            <button className="nav-btn" onClick={() => start(runScope)}>
              같은 범위 새로 풀기
            </button>
            <button className="nav-btn" onClick={openWrongNote}>
              📒 오답노트
            </button>
          </div>
        </div>

        {missed.length > 0 && (
          <div className="exam-review">
            <div className="related-label">틀린 문제</div>
            {missed.map((q) => {
              const a = answers[questions.indexOf(q)];
              return (
                <div key={q.id} className="exam-review-item">
                  <div className="exam-topic">{q.topic}</div>
                  <div className="exam-review-q">{q.q}</div>
                  {q.code && <pre className="exam-code">{q.code}</pre>}
                  <div className="exam-review-a">
                    <span className="q-wrong">{a?.input || "(빈칸)"}</span> → <span className="q-right">{answerOf(q)}</span>
                  </div>
                  {q.ex && <div className="exam-ex">{q.ex}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── 문제 풀기 ──
  const q = questions[idx];
  return (
    <div className="screen">
      <button className="back" onClick={() => setQuestions(null)}>
        ← 그만 풀기
      </button>
      <div className="study-bar">
        <div className="bar exam-bar">
          <span style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <div className="counter">
          {idx + 1} / {questions.length}
        </div>
      </div>
      <Question
        key={`${idx}-${q.id}`}
        q={q}
        answer={answers[idx]}
        onSubmit={(input, right) => submit(q, input, right)}
        onNext={() => (idx + 1 < questions.length ? setIdx(idx + 1) : finish())}
        last={idx + 1 === questions.length}
      />
    </div>
  );
}

function Question({
  q,
  answer,
  onSubmit,
  onNext,
  last,
}: {
  q: ExamQ;
  answer?: Answer;
  onSubmit: (input: string, right: boolean) => void;
  onNext: () => void;
  last: boolean;
}) {
  const [input, setInput] = useState(answer?.input ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const set = EXAM_SETS.find((s) => s.id === q.set)!;

  useEffect(() => {
    if (answer) nextRef.current?.focus();
    else inputRef.current?.focus();
  }, [answer]);

  return (
    <div className="panel">
      <div className="exam-topic">
        {set.emoji} {q.topic}
      </div>
      <h2 className="quiz-q serif">{q.q}</h2>
      {q.code && <pre className="exam-code">{q.code}</pre>}

      <form
        className="exam-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (answer) onNext();
          else if (input.trim()) onSubmit(input, isCorrect(q, input));
        }}
      >
        <input
          ref={inputRef}
          className={`search exam-input ${answer ? (answer.right ? "right" : "wrong") : ""}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          readOnly={!!answer}
          placeholder="답을 입력하고 Enter"
          aria-label="답 입력"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {!answer && (
          <div className="row exam-actions">
            <button type="submit" className="exam-start" disabled={!input.trim()}>
              채점
            </button>
            <button type="button" className="nav-btn" onClick={() => onSubmit(input, false)}>
              모르겠어요
            </button>
          </div>
        )}
      </form>

      {answer && (
        <div className={`exam-feedback ${answer.right ? "right" : "wrong"}`}>
          <div className="exam-verdict">{answer.right ? "⭕ 정답" : "❌ 오답"}</div>
          <div className="exam-answer">
            정답: <b>{answerOf(q)}</b>
          </div>
          {q.ex && <div className="exam-ex">{q.ex}</div>}
          <div className="row exam-actions">
            <button ref={nextRef} className="exam-start" onClick={onNext}>
              {last ? "결과 보기" : "다음 문제 →"}
            </button>
            {!answer.right && answer.input.trim() && (
              <button className="nav-btn" onClick={() => onSubmit(answer.input, true)}>
                맞게 썼어요 (정답 처리)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
