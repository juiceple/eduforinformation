"use client";

import { CLUSTERS, ITEMS, itemsOfCluster, itemsOfSubject, SUBJECTS } from "@/lib/content";
import { INTERVAL_DAYS, isDue, MAX_BOX } from "@/lib/progress";
import { useApp } from "./AppContext";

export default function Home() {
  const { progress, go, reset } = useApp();
  const now = Date.now();
  const due = ITEMS.filter((it) => isDue(progress.map[it.n], now)).length;
  const nextCluster =
    CLUSTERS.find((c) => itemsOfCluster(c.id).some((it) => !progress.map[it.n])) ?? CLUSTERS[0];
  const nextLeft = itemsOfCluster(nextCluster.id).filter((it) => !progress.map[it.n]).length;

  return (
    <>
      <h2 className="page-title">200개를 ‘따로’ 외우지 말고, ‘엮어서’ 외우자</h2>
      <p className="page-sub">
        정보처리산업기사 핵심 요약 001~200을 서로 연결되는 <b>{CLUSTERS.length}개 묶음</b>으로 나누고, 항목마다 <b>암기 훅</b>(두문자·비유)과
        <b> 연결 고리</b>를 붙였습니다. 아래 순서대로 하루 30~40분이면 충분합니다.
      </p>

      <div className="grid grid-2">
        <section className="card">
          <h3 style={{ marginBottom: 6 }}>오늘 할 일</h3>
          <p className="muted small" style={{ marginBottom: 14 }}>복습 먼저, 그다음 새 묶음 하나.</p>
          <div className="grid" style={{ gap: 10 }}>
            <button className="btn primary" disabled={!due} onClick={() => go({ view: "cards", scope: { kind: "due" } })}>
              ① 복습 카드 {due}장 {due ? "풀기" : "— 오늘은 없음"}
            </button>
            <button className="btn" onClick={() => go({ view: "study", cluster: nextCluster.id })}>
              ② 새 묶음 읽기: {nextCluster.emoji} {nextCluster.name} ({nextLeft}개 남음)
            </button>
            <button className="btn" onClick={() => go({ view: "cloze", scope: { kind: "cluster", id: nextCluster.id } })}>
              ③ 방금 묶음 빈칸 채우기
            </button>
            <button className="btn" onClick={() => go({ view: "quiz", scope: { kind: "all" } })}>
              ④ 섞어서 객관식 10문제
            </button>
          </div>
        </section>

        <section className="card">
          <h3 style={{ marginBottom: 12 }}>과목별 숙련도</h3>
          <div className="grid" style={{ gap: 14 }}>
            {SUBJECTS.map((s) => {
              const items = itemsOfSubject(s.id);
              const counts = Array.from({ length: MAX_BOX + 1 }, () => 0);
              items.forEach((it) => counts[progress.map[it.n]?.box ?? 0]++);
              const mastered = counts[4] + counts[5];
              const learning = counts[1] + counts[2] + counts[3];
              return (
                <button
                  key={s.id}
                  className="btn"
                  style={{ textAlign: "left", display: "grid", gap: 6 }}
                  onClick={() => go({ view: "study", cluster: CLUSTERS.find((c) => c.subject === s.id)!.id })}
                >
                  <span className="row">
                    <span className={`num s${s.id}`}>{s.id}과목</span>
                    <span>{s.name}</span>
                    <span className="spacer" />
                    <span className="small muted">{mastered}/{items.length}</span>
                  </span>
                  <span className="bar">
                    <i style={{ width: `${(mastered / items.length) * 100}%`, background: "var(--good)" }} />
                    <i style={{ width: `${(learning / items.length) * 100}%`, background: "var(--warn)" }} />
                  </span>
                </button>
              );
            })}
            <p className="small muted">
              <span style={{ color: "var(--good)" }}>■</span> 장기 기억(4~5단계) <span style={{ color: "var(--warn)" }}>■</span> 학습 중(1~3단계)
            </p>
          </div>
        </section>
      </div>

      <h2 className="page-title" style={{ marginTop: 36 }}>이 사이트의 학습법</h2>
      <p className="page-sub">외우는 힘은 ‘읽기’가 아니라 ‘떠올리기’에서 나옵니다. 그래서 4단계로 설계했습니다.</p>
      <div className="steps">
        <div className="card step">
          <h3>묶음으로 이해하기 — 📚 묶음 학습</h3>
          <p>
            항목을 번호 순서가 아니라 <b>이야기 단위</b>로 읽습니다. 예를 들어 ‘프로세스 · CPU 스케줄링’ 묶음은 프로세스가 태어나서 상태를 돌고,
            CPU를 누가 먼저 받는지까지 한 줄로 이어집니다. 분홍색 <span className="kw">밑줄 키워드</span>가 교재의 핵심어입니다.
          </p>
        </div>
        <div className="card step">
          <h3>암기 훅 붙이기 — 🔑 암기 코드</h3>
          <p>
            나열형은 두문자로(교착상태 4조건 = <b>상·점·비·환</b>, 정규화 = <b>도·부·이·결·다·조</b>), 개념형은 비유로(스택 = 프링글스 통) 외웁니다.
            ‘암기 코드’ 탭에서 모든 훅을 한 장으로 훑을 수 있어 시험 직전 정리에 좋습니다.
          </p>
        </div>
        <div className="card step">
          <h3>연결 고리 따라가기 — 🕸️ 연관 맵</h3>
          <p>
            같은 원리가 과목을 넘어 반복됩니다. CPU 스케줄링 FCFS·SJF ↔ 디스크 FCFS·SSTF, 1과목 캡슐화·상속 ↔ 2과목 OOP 언어 특징,
            트리 운행 Pre/In/Post ↔ 수식 표기법 Prefix/Infix/Postfix. 카드의 <b>🔗 같이 외우기</b>를 누르면 연결된 항목이 바로 열립니다.
          </p>
        </div>
        <div className="card step">
          <h3>떠올리고 간격 두고 반복하기 — ✍️ 빈칸 · 🃏 카드 · 🎯 객관식</h3>
          <p>
            빈칸은 한 번 누르면 <b>초성 힌트</b>, 두 번 누르면 정답. 카드는 ‘몰라요 / 애매해요 / 외웠어요’로 스스로 채점하면 숙련도 단계가 바뀌고,
            다음 복습일이 {INTERVAL_DAYS.slice(1).join("·")}일 간격으로 늘어납니다(라이트너 상자). 틀린 항목은 ‘약점’에 모입니다.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 6 }}>추천 일정 (2주 완성)</h3>
        <ul className="points">
          <li><b>1~5일차</b> — 1과목 13개 묶음: 하루 2~3묶음 읽기 + 빈칸, 다음 날 복습 카드</li>
          <li><b>6~9일차</b> — 2과목 10개 묶음: 코드 예제는 손으로 따라 써 보며 결과값까지 확인</li>
          <li><b>10~12일차</b> — 3과목 9개 묶음: SQL 문법은 ‘짝꿍 단어’(SELECT-FROM, UPDATE-SET)로</li>
          <li><b>13~14일차</b> — ‘약점’ 범위로 카드 + 객관식 반복, 암기 코드 한 장 훑기</li>
        </ul>
      </div>

      <p className="small muted" style={{ marginTop: 24, textAlign: "center" }}>
        학습 기록은 이 브라우저에만 저장됩니다.{" "}
        <button
          className="btn sm"
          onClick={() => {
            if (window.confirm("학습 기록을 모두 지울까요?")) reset();
          }}
        >
          기록 초기화
        </button>
      </p>
    </>
  );
}
