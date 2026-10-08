"use client";

import { useCallback, useEffect, useState } from "react";
import { getCluster, getItem, itemsOfCluster } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import type { SubjectId } from "@/lib/types";
import Home from "./Home";
import Study from "./Study";
import SubjectScreen from "./SubjectScreen";

/** 홈(과목) → 묶음 목록 → 학습 3단계. 주소: #/ · #/s/1 · #/i/12 */
type Route = { screen: "home" } | { screen: "subject"; id: SubjectId } | { screen: "study"; n: number };

function parseHash(): Route {
  const [kind, arg] = window.location.hash.replace(/^#\/?/, "").split("/");
  if (kind === "s" && ["1", "2", "3"].includes(arg)) return { screen: "subject", id: Number(arg) as SubjectId };
  if (kind === "i" && getItem(Number(arg))) return { screen: "study", n: Number(arg) };
  return { screen: "home" };
}

function toHash(r: Route): string {
  if (r.screen === "subject") return `#/s/${r.id}`;
  if (r.screen === "study") return `#/i/${r.n}`;
  return "#/";
}

export default function App() {
  const { progress, ready, markDone } = useProgress();
  const [route, setRoute] = useState<Route>({ screen: "home" });

  useEffect(() => {
    setRoute(parseHash());
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((next: Route) => {
    const screenChanged = next.screen !== route.screen;
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

  return (
    <main className="shell">
      {route.screen === "home" && (
        <Home done={progress.done} openSubject={(id) => go({ screen: "subject", id })} openItem={openItem} />
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
