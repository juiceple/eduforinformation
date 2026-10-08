"use client";

import { useMemo, useState } from "react";
import { CLUSTERS, getCluster, getItem, ITEMS, pad, subjectOf } from "@/lib/content";
import { useApp } from "./AppContext";

interface Edge {
  a: string;
  b: string;
  pairs: [number, number][];
}

function buildEdges(): Edge[] {
  const map = new Map<string, Edge>();
  const seen = new Set<string>();
  for (const it of ITEMS) {
    for (const n of it.r) {
      const other = getItem(n);
      if (!other || other.c === it.c) continue;
      const [x, y] = it.n < n ? [it.n, n] : [n, it.n];
      if (seen.has(`${x}-${y}`)) continue;
      seen.add(`${x}-${y}`);
      const [a, b] = [getItem(x)!.c, getItem(y)!.c].sort();
      const key = `${a}|${b}`;
      const e = map.get(key) ?? { a, b, pairs: [] };
      e.pairs.push([x, y]);
      map.set(key, e);
    }
  }
  return [...map.values()];
}

const SIZE = 1120;
const C = SIZE / 2;
const R = 290;
const SUBJECT_COLOR = ["", "var(--s1)", "var(--s2)", "var(--s3)"];

export default function MapView() {
  const { go, openItem } = useApp();
  const edges = useMemo(buildEdges, []);
  const [sel, setSel] = useState<string | null>(null);

  const pos = useMemo(() => {
    const p = new Map<string, { x: number; y: number; ang: number }>();
    CLUSTERS.forEach((c, i) => {
      // 반 칸 돌려서 맨 위·아래에 노드가 오지 않게 한다(라벨 겹침 방지)
      const ang = ((i + 0.5) / CLUSTERS.length) * Math.PI * 2 - Math.PI / 2;
      p.set(c.id, { x: C + R * Math.cos(ang), y: C + R * Math.sin(ang), ang });
    });
    return p;
  }, []);

  const crossSubject = edges
    .flatMap((e) => e.pairs)
    .filter(([x, y]) => subjectOf(x) !== subjectOf(y))
    .sort((p, q) => p[0] - q[0]);

  const selEdges = sel ? edges.filter((e) => e.a === sel || e.b === sel).sort((p, q) => q.pairs.length - p.pairs.length) : [];

  return (
    <>
      <h2 className="page-title">🕸️ 연관 맵</h2>
      <p className="page-sub">
        {CLUSTERS.length}개 묶음과 그 사이의 연결 고리입니다. 선이 굵을수록 연결이 많아요. 묶음을 누르면 어떤 항목끼리 이어지는지 보여 줍니다.
      </p>

      <div className="card map-wrap">
        <svg className="map-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="묶음 연관 맵">
          {edges.map((e) => {
            const p = pos.get(e.a)!;
            const q = pos.get(e.b)!;
            const active = sel && (e.a === sel || e.b === sel);
            const cross = getCluster(e.a).subject !== getCluster(e.b).subject;
            return (
              <path
                key={`${e.a}-${e.b}`}
                d={`M${p.x},${p.y} Q${C + (p.x + q.x - 2 * C) * 0.2},${C + (p.y + q.y - 2 * C) * 0.2} ${q.x},${q.y}`}
                fill="none"
                stroke={active ? "var(--accent)" : cross ? "var(--key)" : "var(--muted)"}
                strokeOpacity={sel ? (active ? 0.95 : 0.08) : cross ? 0.55 : 0.3}
                strokeWidth={1.2 + e.pairs.length * 1.3}
              />
            );
          })}
          {CLUSTERS.map((c) => {
            const p = pos.get(c.id)!;
            // 라벨은 바깥쪽을 향해 방사형으로 회전, 왼쪽 절반은 뒤집어서 읽기 방향 유지
            const right = Math.cos(p.ang) >= 0;
            const lx = C + (R + 32) * Math.cos(p.ang);
            const ly = C + (R + 32) * Math.sin(p.ang);
            const deg = (p.ang * 180) / Math.PI + (right ? 0 : 180);
            return (
              <g key={c.id} className="map-node" onClick={() => setSel(sel === c.id ? null : c.id)}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={22}
                  fill="var(--surface)"
                  stroke={SUBJECT_COLOR[c.subject]}
                  strokeWidth={sel === c.id ? 5 : 2.5}
                />
                <text x={p.x} y={p.y + 7} textAnchor="middle" fontSize={20}>
                  {c.emoji}
                </text>
                <text
                  x={lx}
                  y={ly}
                  dominantBaseline="middle"
                  transform={`rotate(${deg} ${lx} ${ly})`}
                  textAnchor={right ? "start" : "end"}
                  fontSize={17}
                  fontWeight={sel === c.id ? 800 : 600}
                  fill="var(--text)"
                >
                  {c.name}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="small muted" style={{ textAlign: "center" }}>
          테두리 색 <span style={{ color: "var(--s1)" }}>■ 1과목</span> <span style={{ color: "var(--s2)" }}>■ 2과목</span>{" "}
          <span style={{ color: "var(--s3)" }}>■ 3과목</span> · <span style={{ color: "var(--key)" }}>분홍 선</span> = 과목을 넘나드는 연결
        </p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <label className="small muted" htmlFor="map-sel">묶음 고르기</label>
        <select id="map-sel" className="select" value={sel ?? ""} onChange={(e) => setSel(e.target.value || null)}>
          <option value="">— 묶음을 선택하세요 —</option>
          {CLUSTERS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.subject}과목 · {c.emoji} {c.name}
            </option>
          ))}
        </select>
        {sel && (
          <div style={{ marginTop: 14 }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <h3>
                {getCluster(sel).emoji} {getCluster(sel).name}
              </h3>
              <span className="spacer" />
              <button className="btn sm primary" onClick={() => go({ view: "study", cluster: sel })}>
                이 묶음 공부하기
              </button>
            </div>
            <p className="muted small" style={{ marginBottom: 10 }}>{getCluster(sel).story}</p>
            {selEdges.length === 0 && <p className="muted">다른 묶음과의 직접 연결이 없어요.</p>}
            {selEdges.map((e) => {
              const other = e.a === sel ? e.b : e.a;
              return (
                <div key={other} style={{ marginTop: 10 }}>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>
                    ↔ {getCluster(other).emoji} {getCluster(other).name}
                  </p>
                  {e.pairs.map(([x, y]) => (
                    <PairRow key={`${x}-${y}`} x={x} y={y} openItem={openItem} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 4 }}>과목을 넘나드는 연결 고리 {crossSubject.length}개</h3>
        <p className="muted small" style={{ marginBottom: 10 }}>
          같은 원리가 다른 과목에서 다시 나오는 지점입니다. 한쪽을 외우면 다른 쪽이 공짜로 따라옵니다.
        </p>
        {crossSubject.map(([x, y]) => (
          <PairRow key={`${x}-${y}`} x={x} y={y} openItem={openItem} />
        ))}
      </div>
    </>
  );
}

function PairRow({ x, y, openItem }: { x: number; y: number; openItem: (n: number) => void }) {
  const a = getItem(x)!;
  const b = getItem(y)!;
  return (
    <div className="link-row">
      <button className="chip" style={{ justifySelf: "start" }} onClick={() => openItem(x)}>
        {pad(x)} {a.t}
      </button>
      <span className="arrow">↔</span>
      <button className="chip" style={{ justifySelf: "end" }} onClick={() => openItem(y)}>
        {pad(y)} {b.t}
      </button>
    </div>
  );
}
