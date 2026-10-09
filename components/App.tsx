"use client";

import { useCallback, useEffect, useState } from "react";
import { getCluster, getItem, itemsOfCluster } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import type { NoteDoc, SubjectId } from "@/lib/types";
import Exam from "./Exam";
import Home from "./Home";
import { NoteList, NoteView } from "./Notes";
import Study from "./Study";
import SubjectScreen from "./SubjectScreen";

/** 홈(과목) → 묶음 목록 → 학습 3단계 + 요약노트 + 실기 요약 테스트. 주소: #/ · #/s/1 · #/i/12 · #/notes · #/notes/1 · #/exam */
type Route =
  | { screen: "home" }
  | { screen: "subject"; id: SubjectId }
  | { screen: "study"; n: number }
  | { screen: "notes" }
  | { screen: "note"; id: number }
  | { screen: "exam" };

function parseHash(): Route {
  const [kind, arg] = window.location.hash.replace(/^#\/?/, "").split("/");
  if (kind === "s" && ["1", "2", "3"].includes(arg)) return { screen: "subject", id: Number(arg) as SubjectId };
  if (kind === "i" && getItem(Number(arg))) return { screen: "study", n: Number(arg) };
  if (kind === "exam") return { screen: "exam" };
  if (kind === "notes") return arg && Number(arg) > 0 ? { screen: "note", id: Number(arg) } : { screen: "notes" };
  return { screen: "home" };
}

function toHash(r: Route): string {
  if (r.screen === "subject") return `#/s/${r.id}`;
  if (r.screen === "study") return `#/i/${r.n}`;
  if (r.screen === "exam") return "#/exam";
  if (r.screen === "notes") return "#/notes";
  if (r.screen === "note") return `#/notes/${r.id}`;
  return "#/";
}

export default function App({ notes }: { notes: NoteDoc[] }) {
  const { progress, ready, markDone } = useProgress();
  const [route, setRoute] = useState<Route>({ screen: "home" });

  useEffect(() => {
    setRoute(parseHash());
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((next: Route) => {
    const screenChanged = next.screen !== route.screen || next.screen === "note";
    setRoute(next);
    const hash = toHash(next);
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    if (screenChanged) window.scrollTo({ top: 0 });
  }, [route.screen]);

  const openItem = useCallback((n: number) => go({ screen: "study", n }), [go]);

  /** 묶음을 열면 아직 ‘알아요’ 표시 안 한 첫 항목부터 */
  const openCluster = useCallback(
    (id: string) => {
      const items = itemsOfCluster(id);
      const first = items.find((it) => !progress.done[it.n]) ?? items[0];
      if (first) openItem(first.n);
    },
    [progress.done, openItem],
  );

  if (!ready) return <div className="loading">불러오는 중…</div>;

  const tab = route.screen === "exam" ? "exam" : route.screen === "notes" || route.screen === "note" ? "notes" : "study";
  const tabs: { id: typeof tab; label: string; to: Route }[] = [
    { id: "study", label: "📖 학습노트", to: { screen: "home" } },
    { id: "notes", label: "🗒️ 요약노트", to: { screen: "notes" } },
    { id: "exam", label: "📝 실기 테스트", to: { screen: "exam" } },
  ];
  const note = route.screen === "note" ? notes.find((n) => n.id === route.id) : undefined;

  return (
    <main className="shell">
      {/* 어느 화면에서든 학습노트 · 요약노트 · 실기 테스트로 바로 이동 */}
      <nav className="topnav" aria-label="주 메뉴">
        {tabs.map((t) => (
          <button key={t.id} className={`topnav-tab ${tab === t.id ? "on" : ""}`} onClick={() => go(t.to)} aria-current={tab === t.id ? "page" : undefined}>
            {t.label}
          </button>
        ))}
      </nav>
      {route.screen === "home" && (
        <Home
          done={progress.done}
          openSubject={(id) => go({ screen: "subject", id })}
          openItem={openItem}
          openExam={() => go({ screen: "exam" })}
          openNotes={() => go({ screen: "notes" })}
        />
      )}
      {route.screen === "subject" && (
        <SubjectScreen
          subject={route.id}
          done={progress.done}
          goHome={() => go({ screen: "home" })}
          openCluster={openCluster}
          openItem={openItem}
        />
      )}
      {route.screen === "exam" && <Exam goHome={() => go({ screen: "home" })} />}
      {(route.screen === "notes" || (route.screen === "note" && !note)) && (
        <NoteList notes={notes} openNote={(id) => go({ screen: "note", id })} />
      )}
      {note && (
        <NoteView note={note} notes={notes} back={() => go({ screen: "notes" })} openNote={(id) => go({ screen: "note", id })} />
      )}
      {route.screen === "study" && (
        <Study
          n={route.n}
          done={progress.done}
          markDone={markDone}
          openItem={openItem}
          back={() => go({ screen: "subject", id: getCluster(getItem(route.n)!.c).subject })}
        />
      )}
    </main>
  );
}
