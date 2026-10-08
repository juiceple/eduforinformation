"use client";

import { getCluster, getItem, pad, subjectOf } from "@/lib/content";
import { MAX_BOX } from "@/lib/progress";
import type { Item } from "@/lib/types";
import { useApp } from "./AppContext";
import { Line } from "./Rich";

export function BoxDots({ box }: { box: number }) {
  return (
    <span title={`숙련도 ${box}/${MAX_BOX}`} style={{ display: "inline-flex", gap: 3 }}>
      {Array.from({ length: MAX_BOX }, (_, i) => (
        <i
          key={i}
          style={{
            width: 7, height: 7, borderRadius: 99, display: "inline-block",
            background: i < box ? "var(--good)" : "var(--border)",
          }}
        />
      ))}
    </span>
  );
}

export function RelatedChips({ item }: { item: Item }) {
  const { openItem } = useApp();
  if (!item.r.length) return null;
  return (
    <div className="related">
      <span className="small muted">🔗 같이 외우기</span>
      {item.r.map((n) => {
        const r = getItem(n);
        if (!r) return null;
        const other = r.c !== item.c;
        return (
          <button key={n} className="chip" onClick={() => openItem(n)} title={other ? `다른 묶음: ${getCluster(r.c).name}` : undefined}>
            {other && <span aria-hidden>↗</span>}
            {pad(n)} {r.t}
          </button>
        );
      })}
    </div>
  );
}

export default function ItemCard({
  item,
  hide = false,
  showHook = true,
  showGrade = false,
  showCluster = false,
}: {
  item: Item;
  hide?: boolean;
  showHook?: boolean;
  showGrade?: boolean;
  showCluster?: boolean;
}) {
  const { progress, grade, go } = useApp();
  const st = progress.map[item.n];
  return (
    <article className="card item" id={`item-${item.n}`}>
      <div className="item-head">
        <span className={`num s${subjectOf(item.n)}`}>{pad(item.n)}</span>
        <h3>{item.t}</h3>
        <span className="spacer" />
        {st && <BoxDots box={st.box} />}
      </div>
      {showCluster && (
        <button className="chip" style={{ marginBottom: 10 }} onClick={() => go({ view: "study", cluster: item.c })}>
          {getCluster(item.c).emoji} {getCluster(item.c).name}
        </button>
      )}
      <ul className="points">
        {item.p.map((l, i) => (
          <li key={i}>
            <Line text={l} hide={hide} />
          </li>
        ))}
      </ul>
      {item.ex && <div className="example">{item.ex}</div>}
      {showHook && (
        <div className="hook">
          <b>암기 훅</b> · {item.m}
        </div>
      )}
      <RelatedChips item={item} />
      {showGrade && (
        <div className="row" style={{ marginTop: 14 }}>
          <span className="small muted">스스로 체크:</span>
          <button className="btn sm bad" onClick={() => grade(item.n, "again")}>몰라요</button>
          <button className="btn sm warn" onClick={() => grade(item.n, "hard")}>애매해요</button>
          <button className="btn sm good" onClick={() => grade(item.n, "good")}>외웠어요</button>
        </div>
      )}
    </article>
  );
}
