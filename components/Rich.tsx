"use client";

import { useState } from "react";
import { chosung, segments } from "@/lib/content";

/** 본문 한 줄 렌더링. hide=true면 [[키워드]]를 빈칸으로 가리고, 눌러서 초성 힌트 → 정답 순으로 연다. */
export function Line({ text, hide }: { text: string; hide: boolean }) {
  return (
    <>
      {segments(text).map((s, i) =>
        s.key ? hide ? <Blank key={i} answer={s.text} /> : <span key={i} className="kw">{s.text}</span> : <span key={i}>{s.text}</span>,
      )}
    </>
  );
}

function Blank({ answer }: { answer: string }) {
  const [stage, setStage] = useState(0); // 0 가림, 1 초성, 2 정답
  const label = stage === 0 ? answer : stage === 1 ? chosung(answer) : answer;
  return (
    <button
      type="button"
      className={`blank ${stage === 1 ? "hint" : ""} ${stage === 2 ? "open" : ""}`}
      title={stage === 0 ? "눌러서 초성 힌트" : stage === 1 ? "한 번 더 누르면 정답" : "다시 가리기"}
      onClick={() => setStage((s) => (s + 1) % 3)}
    >
      {label}
    </button>
  );
}
