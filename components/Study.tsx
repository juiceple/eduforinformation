"use client";

import { useState } from "react";
import { CLUSTERS, getCluster, getItem, itemsOfCluster, SUBJECTS } from "@/lib/content";
import { useApp } from "./AppContext";
import ItemCard from "./ItemCard";

/** 이 묶음과 연결 고리(r)로 이어진 다른 묶음들 */
function linkedClusters(id: string): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const it of itemsOfCluster(id)) {
    for (const n of it.r) {
      const other = getItem(n);
      if (other && other.c !== id) counts.set(other.c, (counts.get(other.c) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}

export default function Study({ clusterId }: { clusterId?: string }) {
  const { progress, go } = useApp();
  const [hide, setHide] = useState(false);
  const [hooks, setHooks] = useState(true);
  const cluster = getCluster(clusterId && CLUSTERS.some((c) => c.id === clusterId) ? clusterId : CLUSTERS[0].id);
  const items = itemsOfCluster(cluster.id);
  const idx = CLUSTERS.findIndex((c) => c.id === cluster.id);
  const prev = CLUSTERS[idx - 1];
  const next = CLUSTERS[idx + 1];
  const linked = linkedClusters(cluster.id);

  return (
    <div className="study">
      <aside className="side" aria-label="묶음 목록">
        {SUBJECTS.map((s) => (
          <div key={s.id}>
            <h4>{s.id}과목 · {s.name}</h4>
            {CLUSTERS.filter((c) => c.subject === s.id).map((c) => {
              const its = itemsOfCluster(c.id);
              const done = its.filter((it) => (progress.map[it.n]?.box ?? 0) >= 1).length;
              return (
                <button
                  key={c.id}
                  className={`side-btn ${c.id === cluster.id ? "active" : ""}`}
                  onClick={() => go({ view: "study", cluster: c.id })}
                >
                  <span>{c.emoji}</span>
                  <span>{c.name}</span>
                  <small>{done}/{its.length}</small>
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      <section>
        <select
          className="select select-mobile"
          value={cluster.id}
          onChange={(e) => go({ view: "study", cluster: e.target.value })}
          aria-label="묶음 선택"
        >
          {SUBJECTS.map((s) => (
            <optgroup key={s.id} label={`${s.id}과목 ${s.name}`}>
              {CLUSTERS.filter((c) => c.subject === s.id).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="story">
          <p className="small muted" style={{ marginBottom: 4 }}>
            {cluster.subject}과목 · 묶음 {idx + 1}/{CLUSTERS.length} · {items.length}개 항목
          </p>
          <h2>
            {cluster.emoji} {cluster.name}
          </h2>
          <p>📖 {cluster.story}</p>
          {linked.length > 0 && (
            <div className="related" style={{ marginTop: 12 }}>
              <span className="small muted">이어지는 묶음</span>
              {linked.slice(0, 6).map((l) => (
                <button key={l.id} className="chip" onClick={() => go({ view: "study", cluster: l.id })}>
                  {getCluster(l.id).emoji} {getCluster(l.id).name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="row" style={{ marginBottom: 14 }}>
          <button className={`btn sm ${hide ? "primary" : ""}`} onClick={() => setHide((h) => !h)}>
            {hide ? "🙈 키워드 가리는 중" : "🙈 키워드 가리기"}
          </button>
          <button className={`btn sm ${!hooks ? "primary" : ""}`} onClick={() => setHooks((h) => !h)}>
            {hooks ? "💡 암기 훅 숨기기" : "💡 암기 훅 보기"}
          </button>
          <span className="spacer" />
          <button className="btn sm" onClick={() => go({ view: "cloze", scope: { kind: "cluster", id: cluster.id } })}>
            ✍️ 이 묶음 빈칸
          </button>
          <button className="btn sm" onClick={() => go({ view: "cards", scope: { kind: "cluster", id: cluster.id } })}>
            🃏 이 묶음 카드
          </button>
        </div>
        {hide && (
          <p className="small muted" style={{ marginBottom: 12 }}>
            분홍 빈칸을 한 번 누르면 초성 힌트, 한 번 더 누르면 정답이 보입니다. 떠올린 뒤 아래 버튼으로 스스로 체크하세요.
          </p>
        )}

        <div className="grid">
          {items.map((it) => (
            <ItemCard key={`${it.n}-${hide}`} item={it} hide={hide} showHook={hooks} showGrade />
          ))}
        </div>

        <div className="row" style={{ marginTop: 20 }}>
          {prev && (
            <button className="btn" onClick={() => go({ view: "study", cluster: prev.id })}>
              ← {prev.emoji} {prev.name}
            </button>
          )}
          <span className="spacer" />
          {next && (
            <button className="btn primary" onClick={() => go({ view: "study", cluster: next.id })}>
              {next.emoji} {next.name} →
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
