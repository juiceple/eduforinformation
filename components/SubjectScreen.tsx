"use client";

import { CLUSTERS, itemsOfCluster, SUBJECTS } from "@/lib/content";
import type { SubjectId } from "@/lib/types";

export default function SubjectScreen({
  subject,
  done,
  goHome,
  openCluster,
  openItem,
}: {
  subject: SubjectId;
  done: Record<number, boolean>;
  goHome: () => void;
  openCluster: (id: string) => void;
  openItem: (n: number) => void;
}) {
  const s = SUBJECTS.find((x) => x.id === subject)!;

  return (
    <div className="screen">
      <button className="back" onClick={goHome}>
        ← 전체 과목
      </button>
      <h1 className="screen-title serif">{s.name}</h1>

      <div className="clusters">
        {CLUSTERS.filter((c) => c.subject === subject).map((c) => {
          const items = itemsOfCluster(c.id);
          const doneCount = items.filter((it) => done[it.n]).length;
          return (
            <section key={c.id} className="cluster">
              <button className="cluster-head" onClick={() => openCluster(c.id)}>
                <span className="cluster-name">
                  <span>{c.emoji}</span>
                  <span>{c.name}</span>
                </span>
                <span className="cluster-count">
                  {doneCount}/{items.length}
                </span>
              </button>
              <p className="cluster-story">{c.story}</p>
              <div className="chips">
                {items.map((it) => (
                  <button
                    key={it.n}
                    className={`chip ${done[it.n] ? "done" : ""}`}
                    onClick={() => openItem(it.n)}
                    title={it.t}
                  >
                    {it.n}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
