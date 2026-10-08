"use client";

import { CLUSTERS, SUBJECTS } from "@/lib/content";
import type { Item } from "@/lib/types";
import { useApp, type Scope } from "./AppContext";
import { scopeItems } from "./scope";

const same = (a: Scope, b: Scope) =>
  a.kind === b.kind && ("id" in a ? a.id : "") === ("id" in b ? b.id : "");

export default function ScopePicker({ scope, onChange, pool }: { scope: Scope; onChange: (s: Scope) => void; pool?: Item[] }) {
  const { progress } = useApp();
  const quick: Scope[] = [{ kind: "due" }, { kind: "new" }, { kind: "weak" }, { kind: "all" }];
  const labels: Record<string, string> = { due: "오늘 복습", new: "새 항목", weak: "약점", all: "전체" };
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="row">
        {quick.map((s) => (
          <button key={s.kind} className={`chip ${same(s, scope) ? "active" : ""}`} onClick={() => onChange(s)}>
            {labels[s.kind]} <span className="small">{scopeItems(s, progress, pool).length}</span>
          </button>
        ))}
        {SUBJECTS.map((s) => {
          const sc: Scope = { kind: "subject", id: s.id };
          return (
            <button key={s.id} className={`chip ${same(sc, scope) ? "active" : ""}`} onClick={() => onChange(sc)}>
              {s.id}과목
            </button>
          );
        })}
      </div>
      <select
        className="select"
        style={{ marginTop: 10 }}
        value={scope.kind === "cluster" ? scope.id : ""}
        onChange={(e) => e.target.value && onChange({ kind: "cluster", id: e.target.value })}
      >
        <option value="">묶음 하나만 고르기…</option>
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
    </div>
  );
}
