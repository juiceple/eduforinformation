"use client";

import { useState } from "react";
import { getCluster, getItem, plain, segments } from "@/lib/content";
import { answerOf, EXAM, EXAM_SETS } from "@/lib/exam";
import { type Attempt, dateKey, type History, type WrongEntry, wrongEntries } from "@/lib/history";

type Tab = "wrong" | "log";
type Kind = "all" | "exam" | "quiz";

const examById = new Map(EXAM.map((q) => [q.id, q]));

function when(t: number): string {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const names = ["일", "월", "화", "수", "목", "금", "토"];
  const today = dateKey(Date.now());
  const yesterday = dateKey(Date.now() - 24 * 60 * 60 * 1000);
  const suffix = key === today ? " · 오늘" : key === yesterday ? " · 어제" : "";
  return `${y}년 ${m}월 ${d}일 (${names[new Date(y, m - 1, d).getDay()]})${suffix}`;
}

/** 기록 key가 지금도 있는 문제를 가리키는지 (문제 수정으로 없어진 문제는 건너뛴다) */
function exists(key: string): boolean {
  const [kind, id] = key.split(":");
  return kind === "exam" ? examById.has(id) : kind === "quiz" ? !!getItem(Number(id)) : false;
}

const kindOf = (key: string): Exclude<Kind, "all"> => (key.startsWith("exam:") ? "exam" : "quiz");

/** 문제 제목 한 줄 (풀이 기록 목록용) */
function title(key: string): string {
  const [kind, id] = key.split(":");
  if (kind === "exam") return examById.get(id)!.q;
  const it = getItem(Number(id))!;
  return `${it.n}. ${it.t}`;
}

export default function WrongNote({
  history,
  clear,
  retryExam,
  openItem,
}: {
  history: History;
  clear: (key: string) => void;
  retryExam: (ids: string[]) => void;
  openItem: (n: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("wrong");
  const [kind, setKind] = useState<Kind>("all");
  const [shown, setShown] = useState(100);

  const attempts = history.attempts.filter((a) => exists(a.key));
  const entries = wrongEntries({ ...history, attempts });
  const rightCount = attempts.filter((a) => a.right).length;
  const pct = attempts.length ? Math.round((rightCount / attempts.length) * 100) : 0;

  const byKind = (key: string) => kind === "all" || kindOf(key) === kind;
  const list = entries.filter((e) => byKind(e.key));
  const examWrong = list.filter((e) => kindOf(e.key) === "exam" && e.streak === 0).map((e) => e.key.slice(5));
  const log = attempts.filter((a) => byKind(a.key)).reverse();

  const kinds: { id: Kind; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "exam", label: "📝 실기 테스트" },
    { id: "quiz", label: "📖 학습노트 객관식" },
  ];

  return (
    <div className="screen">
      <h1 className="screen-title serif">📒 오답노트</h1>
      <p className="exam-lead">
        실기 테스트와 학습노트 객관식에서 답을 낼 때마다 자동으로 기록돼요. 틀린 문제는 여기 모였다가, 다 외웠으면 직접 뺄 수 있어요.
      </p>

      <div className="wn-stats">
        <div className="wn-stat">
          <b className="serif">{attempts.length}</b>
          <span>푼 횟수</span>
        </div>
        <div className="wn-stat">
          <b className="serif">{attempts.length ? `${pct}%` : "–"}</b>
          <span>정답률</span>
        </div>
        <div className="wn-stat">
          <b className="serif">{entries.length}</b>
          <span>오답노트 문제</span>
        </div>
      </div>

      <div className="wn-bar">
        <div className="modes" role="tablist">
          <button role="tab" aria-selected={tab === "wrong"} className={`mode ${tab === "wrong" ? "active" : ""}`} onClick={() => setTab("wrong")}>
            틀린 문제
          </button>
          <button role="tab" aria-selected={tab === "log"} className={`mode ${tab === "log" ? "active" : ""}`} onClick={() => setTab("log")}>
            풀이 기록
          </button>
        </div>
        <div className="wn-kinds">
          {kinds.map((k) => (
            <button key={k.id} className={`related-chip ${kind === k.id ? "on" : ""}`} onClick={() => setKind(k.id)} aria-pressed={kind === k.id}>
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "wrong" && (
        <>
          {examWrong.length > 0 && (
            <button className="exam-start wn-retry" onClick={() => retryExam(examWrong)}>
              🔁 실기 오답 {examWrong.length}문제 다시 풀기
            </button>
          )}
          {list.length === 0 ? (
            <div className="empty">
              {attempts.length === 0 ? "아직 푼 문제가 없어요. 실기 테스트나 학습노트 객관식을 풀어보세요." : "틀린 문제가 없어요 👏"}
            </div>
          ) : (
            <div className="exam-review">
              {list.map((e) => (
                <WrongCard key={e.key} entry={e} clear={clear} openItem={openItem} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "log" &&
        (log.length === 0 ? (
          <div className="empty">아직 풀이 기록이 없어요.</div>
        ) : (
          <div className="wn-log">
            {log.slice(0, shown).map((a, i, arr) => {
              const day = dateKey(a.at);
              const newDay = i === 0 || dateKey(arr[i - 1].at) !== day;
              return (
                <div key={`${a.at}-${a.key}`}>
                  {newDay && <div className="related-label wn-day">{dayLabel(day)}</div>}
                  <LogRow a={a} openItem={openItem} />
                </div>
              );
            })}
            {log.length > shown && (
              <button className="nav-btn wn-more" onClick={() => setShown((s) => s + 100)}>
                더 보기 ({log.length - shown}개 남음)
              </button>
            )}
          </div>
        ))}
    </div>
  );
}

function Trail({ attempts }: { attempts: Attempt[] }) {
  return (
    <div className="wn-trail">
      {attempts.slice(-8).map((a) => (
        <span key={a.at} className={`wn-try ${a.right ? "right" : "wrong"}`} title={when(a.at)}>
          {a.right ? "⭕" : "❌"} {a.input.trim() || "(빈칸)"}
          <small>{when(a.at)}</small>
        </span>
      ))}
    </div>
  );
}

function WrongCard({ entry, clear, openItem }: { entry: WrongEntry; clear: (key: string) => void; openItem: (n: number) => void }) {
  const [kind, id] = entry.key.split(":");
  const wrongs = entry.attempts.filter((a) => !a.right).length;
  const status =
    entry.streak > 0 ? <span className="wn-badge ok">✅ 그 뒤로 {entry.streak}번 맞힘</span> : <span className="wn-badge bad">❌ {wrongs}번 틀림</span>;
  const remove = (
    <button className="nav-btn" onClick={() => clear(entry.key)}>
      {entry.streak > 0 ? "다 외웠어요 · 빼기" : "오답노트에서 빼기"}
    </button>
  );

  if (kind === "exam") {
    const q = examById.get(id)!;
    const set = EXAM_SETS.find((s) => s.id === q.set)!;
    return (
      <div className="exam-review-item">
        <div className="wn-head">
          <div className="exam-topic">
            {set.emoji} {q.topic}
          </div>
          {status}
        </div>
        <div className="exam-review-q">{q.q}</div>
        {q.code && <pre className="exam-code">{q.code}</pre>}
        <Trail attempts={entry.attempts} />
        <div className="exam-review-a">
          정답 <span className="q-right">{answerOf(q)}</span>
        </div>
        {q.ex && <div className="exam-ex">{q.ex}</div>}
        <div className="row wn-actions">{remove}</div>
      </div>
    );
  }

  const item = getItem(Number(id))!;
  const last = entry.lastWrong;
  const line = last.li !== undefined ? item.p[last.li] : undefined;
  return (
    <div className="exam-review-item">
      <div className="wn-head">
        <div className="exam-topic">
          {getCluster(item.c).emoji} 학습노트 객관식 · {getCluster(item.c).name}
        </div>
        {status}
      </div>
      <div className="exam-review-q">
        <b>
          No. {item.n} {item.t}
        </b>
      </div>
      {line && (
        <div className="wn-line">
          {segments(line).map((s, i) =>
            s.key && s.text === last.answer ? (
              <span key={i} className="q-right">
                {s.text}
              </span>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )}
        </div>
      )}
      <Trail attempts={entry.attempts} />
      <div className="row wn-actions">
        <button className="exam-start" onClick={() => openItem(item.n)}>
          항목 다시 보기
        </button>
        {remove}
      </div>
    </div>
  );
}

function LogRow({ a, openItem }: { a: Attempt; openItem: (n: number) => void }) {
  const quiz = kindOf(a.key) === "quiz";
  const correct = quiz ? a.answer : answerOf(examById.get(a.key.slice(5))!);
  const text = title(a.key);
  return (
    <div className={`wn-row ${a.right ? "right" : "wrong"}`}>
      <span className="wn-mark">{a.right ? "⭕" : "❌"}</span>
      <span className="result-body">
        {quiz ? (
          <button className="wn-row-title link-like" onClick={() => openItem(Number(a.key.slice(5)))}>
            {plain(text)}
          </button>
        ) : (
          <span className="wn-row-title">{text}</span>
        )}
        <span className="result-meta">
          {String(new Date(a.at).getHours()).padStart(2, "0")}:{String(new Date(a.at).getMinutes()).padStart(2, "0")} · {quiz ? "객관식" : "실기"} · 내 답{" "}
          <span className={a.right ? "q-right" : "q-wrong"}>{a.input.trim() || "(빈칸)"}</span>
          {!a.right && correct && (
            <>
              {" "}
              → <span className="q-right">{correct}</span>
            </>
          )}
        </span>
      </span>
    </div>
  );
}
