"use client";

import { useState } from "react";
import { EXAM } from "@/lib/exam";
import { CLUSTERS, getCluster, ITEMS, itemsOfSubject, pad, plain, SUBJECTS } from "@/lib/content";
import type { SubjectId } from "@/lib/types";

export const SUBJECT_EMOJI: Record<SubjectId, string> = { 1: "🖥️", 2: "💻", 3: "🗄️" };

export default function Home({
  done,
  openSubject,
  openItem,
  openExam,
  openNotes,
  openWrongNote,
  wrongCount,
}: {
  done: Record<number, boolean>;
  openSubject: (id: SubjectId) => void;
  openItem: (n: number) => void;
  openExam: () => void;
  openNotes: () => void;
  openWrongNote: () => void;
  wrongCount: number;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const results = q
    ? ITEMS.filter((it) => `${it.t} ${it.p.map(plain).join(" ")}`.toLowerCase().includes(q) || String(it.n).includes(q)).slice(0, 30)
    : [];

  return (
    <div className="home">
      <h1 className="home-title serif">정처기 학습노트</h1>
      <div className="home-sub">정보처리산업기사 핵심 200문항</div>

      <button className="exam-entry" onClick={openExam}>
        <span className="subject-emoji">📝</span>
        <span className="result-body">
          <span className="subject-name serif">실기 요약 테스트 풀기</span>
          <span className="subject-meta">운영체제 · 네트워크 · 개발환경·테스트·SQL 단답형 {EXAM.length}문제</span>
        </span>
        <span className="exam-entry-go">시작 →</span>
      </button>
      <button className="exam-entry" onClick={openNotes}>
        <span className="subject-emoji">🗒️</span>
        <span className="result-body">
          <span className="subject-name serif">실기 총요약 요약노트 보기</span>
          <span className="subject-meta">(1) 운영체제 · (2) 네트워크 · (3) 개발환경·테스트·SQL</span>
        </span>
        <span className="exam-entry-go">열기 →</span>
      </button>
      <button className="exam-entry" onClick={openWrongNote}>
        <span className="subject-emoji">📒</span>
        <span className="result-body">
          <span className="subject-name serif">오답노트</span>
          <span className="subject-meta">
            {wrongCount ? `다시 볼 문제 ${wrongCount}개 · ` : ""}실기 테스트 · 객관식 풀이 기록
          </span>
        </span>
        <span className="exam-entry-go">열기 →</span>
      </button>

      <input
        className="search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="항목 검색 — 예: 세마포어, 정규화, SJF..."
        aria-label="항목 검색"
      />

      {q ? (
        <div className="results">
          {results.map((it) => {
            const cl = getCluster(it.c);
            return (
              <button key={it.n} className="result" onClick={() => openItem(it.n)}>
                <span className="result-emoji">{cl.emoji}</span>
                <span className="result-body">
                  <span className="result-title">{it.t}</span>
                  <span className="result-meta">
                    {it.n}번 · {cl.name}
                  </span>
                </span>
              </button>
            );
          })}
          {results.length === 0 && <div className="empty">검색 결과가 없어요</div>}
        </div>
      ) : (
        <div className="subjects">
          {SUBJECTS.map((s) => {
            const items = itemsOfSubject(s.id);
            const doneCount = items.filter((it) => done[it.n]).length;
            const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
            return (
              <button key={s.id} className="subject" onClick={() => openSubject(s.id)}>
                <span className="subject-emoji">{SUBJECT_EMOJI[s.id]}</span>
                <span className="subject-name serif">{s.name}</span>
                <span className="subject-meta">
                  {pad(s.range[0])}–{pad(s.range[1])} · {CLUSTERS.filter((c) => c.subject === s.id).length}개 묶음 ·{" "}
                  {items.length}문항
                </span>
                <span className="bar">
                  <span style={{ width: `${pct}%` }} />
                </span>
                <span className="subject-done">
                  {doneCount} / {items.length} 완료
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
