"use client";

import { useState } from "react";
import { CLUSTERS, itemsOfCluster, normalize, pad, plain, SUBJECTS } from "@/lib/content";
import { useApp } from "./AppContext";
import { BoxDots } from "./ItemCard";

export default function Codes() {
  const { progress, openItem, go } = useApp();
  const [q, setQ] = useState("");
  const query = normalize(q);
  const match = (text: string) => !query || normalize(text).includes(query);

  return (
    <>
      <h2 className="page-title">🔑 암기 코드</h2>
      <p className="page-sub">
        200개 항목의 암기 훅을 묶음별로 한 장에. 시험 직전 훑어보기용이고, 검색창으로 용어를 바로 찾을 수도 있어요.
      </p>
      <input
        className="search"
        placeholder="검색: 예) 세마포어, LIFO, 응집도, SELECT…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="항목 검색"
      />
      {SUBJECTS.map((s) => {
        const clusters = CLUSTERS.filter((c) => c.subject === s.id)
          .map((c) => ({
            c,
            items: itemsOfCluster(c.id).filter((it) => match(`${it.n} ${it.t} ${it.m} ${it.p.map(plain).join(" ")} ${it.ex ?? ""}`)),
          }))
          .filter((x) => x.items.length);
        if (!clusters.length) return null;
        return (
          <section key={s.id} style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 10 }}>
              <span className={`num s${s.id}`}>{s.id}과목</span> {s.name}
            </h3>
            <div className="grid">
              {clusters.map(({ c, items }) => (
                <div key={c.id} className="card">
                  <div className="row" style={{ marginBottom: 6 }}>
                    <h4 style={{ fontSize: 16 }}>
                      {c.emoji} {c.name}
                    </h4>
                    <span className="spacer" />
                    <button className="btn sm" onClick={() => go({ view: "study", cluster: c.id })}>
                      묶음 학습 →
                    </button>
                  </div>
                  <table className="table">
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.n}>
                          <td>
                            <button className="chip" onClick={() => openItem(it.n)}>
                              {pad(it.n)}
                            </button>
                          </td>
                          <td>
                            {it.t}
                            {progress.map[it.n] && (
                              <div>
                                <BoxDots box={progress.map[it.n].box} />
                              </div>
                            )}
                          </td>
                          <td>{it.m}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
