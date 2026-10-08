"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getItem, ITEMS } from "@/lib/content";
import { isDue, streak, useProgress } from "@/lib/progress";
import { AppCtx, type Ctx, type Nav, type View } from "./AppContext";
import Cloze from "./Cloze";
import Codes from "./Codes";
import Flashcards from "./Flashcards";
import Home from "./Home";
import ItemCard from "./ItemCard";
import MapView from "./MapView";
import Quiz from "./Quiz";
import Study from "./Study";

const TABS: { id: View; label: string }[] = [
  { id: "home", label: "🏠 학습법" },
  { id: "study", label: "📚 묶음 학습" },
  { id: "cards", label: "🃏 플래시카드" },
  { id: "cloze", label: "✍️ 빈칸 채우기" },
  { id: "quiz", label: "🎯 객관식" },
  { id: "map", label: "🕸️ 연관 맵" },
  { id: "codes", label: "🔑 암기 코드" },
];

function parseHash(): Nav {
  if (typeof window === "undefined") return { view: "home" };
  const [view, cluster] = window.location.hash.replace(/^#\/?/, "").split("/");
  if (TABS.some((t) => t.id === view)) return { view: view as View, cluster: cluster || undefined };
  return { view: "home" };
}

export default function App() {
  const { progress, ready, grade, reset } = useProgress();
  const [nav, setNav] = useState<Nav>({ view: "home" });
  const [modal, setModal] = useState<number | null>(null);

  useEffect(() => {
    setNav(parseHash());
    const onHash = () => setNav((prev) => ({ ...parseHash(), scope: prev.scope }));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((next: Nav) => {
    setNav(next);
    setModal(null);
    const hash = `#/${next.view}${next.cluster ? `/${next.cluster}` : ""}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (modal === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setModal(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const ctx: Ctx = useMemo(
    () => ({ progress, ready, grade, reset, go, openItem: setModal }),
    [progress, ready, grade, reset, go],
  );

  const now = Date.now();
  const due = ITEMS.filter((it) => isDue(progress.map[it.n], now)).length;
  const seen = Object.keys(progress.map).length;
  const days = streak(progress.days);
  const modalItem = modal !== null ? getItem(modal) : undefined;

  return (
    <AppCtx.Provider value={ctx}>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <h1>
              정처산기 <span>연관 암기</span>
            </h1>
            {ready && (
              <div className="stats-mini">
                <span>복습 <b>{due}</b></span>
                <span>학습 <b>{seen}</b>/200</span>
                <span>🔥 <b>{days}</b>일</span>
              </div>
            )}
          </div>
          <nav className="tabs" aria-label="학습 메뉴">
            {TABS.map((t) => (
              <button key={t.id} className={`tab ${nav.view === t.id ? "active" : ""}`} onClick={() => go({ view: t.id })}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="shell">
        {nav.view === "home" && <Home />}
        {nav.view === "study" && <Study clusterId={nav.cluster} />}
        {nav.view === "cards" && <Flashcards initial={nav.scope} />}
        {nav.view === "cloze" && <Cloze initial={nav.scope} />}
        {nav.view === "quiz" && <Quiz initial={nav.scope} />}
        {nav.view === "map" && <MapView />}
        {nav.view === "codes" && <Codes />}
      </main>

      {modalItem && (
        <div className="overlay" onClick={() => setModal(null)} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: "flex-end", marginBottom: 8 }}>
              <button className="btn sm" onClick={() => go({ view: "study", cluster: modalItem.c })}>
                이 묶음으로 이동
              </button>
              <button className="btn sm" onClick={() => setModal(null)}>닫기 ✕</button>
            </div>
            <ItemCard key={modalItem.n} item={modalItem} showCluster />
          </div>
        </div>
      )}
    </AppCtx.Provider>
  );
}
