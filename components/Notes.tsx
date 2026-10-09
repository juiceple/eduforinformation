"use client";

import type { NoteDoc } from "@/lib/types";

/** 요약노트 목록 */
export function NoteList({ notes, openNote }: { notes: NoteDoc[]; openNote: (id: number) => void }) {
  return (
    <div className="screen">
      <h1 className="screen-title serif">🗒️ 실기 총요약 요약노트</h1>
      <p className="exam-lead">정보처리산업기사 실기 총요약을 정리하고, 빠진 부분은 [보충]으로 채운 노트예요.</p>
      <div className="clusters">
        {notes.map((n) => (
          <button key={n.id} className="result note-card" onClick={() => openNote(n.id)}>
            <span className="result-emoji">{n.emoji}</span>
            <span className="result-body">
              <span className="result-title">
                ({n.id}) {n.name}
              </span>
              <span className="result-meta">{n.toc.length}개 단원</span>
            </span>
            <span className="exam-entry-go">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** 요약노트 한 편 */
export function NoteView({
  note,
  notes,
  back,
  openNote,
}: {
  note: NoteDoc;
  notes: NoteDoc[];
  back: () => void;
  openNote: (id: number) => void;
}) {
  const prev = notes.find((n) => n.id === note.id - 1);
  const next = notes.find((n) => n.id === note.id + 1);
  // 주소창 #은 화면 이동에 쓰므로 목차는 스크롤로 이동
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="screen">
      <button className="back" onClick={back}>
        ← 요약노트 목록
      </button>
      <div className="note-toc">
        {note.toc.map((t) => (
          <button key={t.id} className="related-chip" onClick={() => jump(t.id)}>
            {t.text}
          </button>
        ))}
      </div>
      <article className="panel note" dangerouslySetInnerHTML={{ __html: note.html }} />
      <div className="study-foot">
        <div className="row">
          {prev && (
            <button className="nav-btn" onClick={() => openNote(prev.id)}>
              ← ({prev.id}) {prev.name}
            </button>
          )}
        </div>
        <div className="row">
          {next && (
            <button className="nav-btn" onClick={() => openNote(next.id)}>
              ({next.id}) {next.name} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
