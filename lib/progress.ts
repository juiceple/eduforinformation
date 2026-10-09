"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 라이트너(Leitner) 간격 반복.
 * box 0 = 아직 안 봄, 1~5 = 숙련도. 맞히면 한 칸 올라가고, 틀리면 1로 떨어진다.
 * 다음 복습까지 간격(일): box1=1, box2=2, box3=4, box4=7, box5=15
 */
export const INTERVAL_DAYS = [0, 1, 2, 4, 7, 15];
export const MAX_BOX = 5;
const DAY = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "edu-info-progress-v1";

export interface CardState {
  box: number;
  due: number;
  right: number;
  wrong: number;
  last: number;
}

export type Grade = "again" | "hard" | "good";

export type ProgressMap = Record<number, CardState>;

export interface Progress {
  map: ProgressMap;
  /** 오늘 공부한 날짜 기록 (연속 학습일 계산용) */
  days: string[];
  /** 학습 화면의 ‘알아요(true) / 다시 볼게요(false)’ 표시. 없으면 아직 표시 안 함 */
  done: Record<number, boolean>;
  /** 마지막으로 바뀐 시각(ms). 기기 간 동기화 때 더 최근 기록을 고르는 데 쓴다 */
  savedAt: number;
}

const empty: Progress = { map: {}, days: [], done: {}, savedAt: 0 };

/** done 기록이 없던 이전 버전 데이터: 상자 2 이상은 ‘알아요’, 상자 1은 ‘다시 볼게요’로 옮긴다. */
function migrateDone(map: ProgressMap): Record<number, boolean> {
  const done: Record<number, boolean> = {};
  for (const [n, s] of Object.entries(map)) {
    if (s.box >= 2) done[Number(n)] = true;
    else if (s.box === 1) done[Number(n)] = false;
  }
  return done;
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function nextState(prev: CardState | undefined, grade: Grade): CardState {
  const now = Date.now();
  const base: CardState = prev ?? { box: 0, due: 0, right: 0, wrong: 0, last: 0 };
  let box: number;
  if (grade === "again") box = 1;
  else if (grade === "hard") box = Math.max(1, Math.min(base.box, MAX_BOX));
  else box = Math.min(MAX_BOX, Math.max(1, base.box + 1));
  // 복습 시점은 그날 0시 기준으로 맞춰서 ‘오늘 할 일’이 깔끔하게 나뉘게 한다.
  const due = grade === "again" ? now : startOfToday() + INTERVAL_DAYS[box] * DAY;
  return {
    box,
    due,
    right: base.right + (grade === "again" ? 0 : 1),
    wrong: base.wrong + (grade === "again" ? 1 : 0),
    last: now,
  };
}

export function isDue(s: CardState | undefined, now = Date.now()): boolean {
  return !!s && s.box > 0 && s.due <= now;
}

function normalize(parsed: Partial<Progress>): Progress {
  const map = parsed.map ?? {};
  return {
    map,
    days: parsed.days ?? [],
    done: parsed.done ?? migrateDone(map),
    // savedAt이 없던 이전 버전 기록은 ‘아주 오래전’으로 쳐서, 웹에 기록이 없을 때만 올라가게 한다.
    savedAt: parsed.savedAt ?? (Object.keys(map).length > 0 ? 1 : 0),
  };
}

function load(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    return normalize(JSON.parse(raw) as Partial<Progress>);
  } catch {
    return empty;
  }
}

/**
 * 웹(Supabase) 저장. 혼자 쓰는 사이트라 로그인 없이 행 하나(REMOTE_ID)에 통째로 저장한다.
 * localStorage는 오프라인·빠른 첫 화면용 사본이고, 기기 간에는 savedAt이 더 최근인 쪽이 이긴다.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://htxlggyucplpjhiyymkt.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY ?? "sb_publishable_q3rO1yp60wHw2-f1ROdfqg_MXRSQjzF";
const REMOTE_URL = `${SUPABASE_URL}/rest/v1/edu_progress`;
const REMOTE_ID = "me";
const REMOTE_DELAY = 800;

async function loadRemote(): Promise<Progress | null> {
  try {
    const res = await fetch(`${REMOTE_URL}?id=eq.${REMOTE_ID}&select=data`, {
      headers: { apikey: SUPABASE_KEY },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { data: Partial<Progress> }[];
    return rows[0] ? normalize(rows[0].data) : null;
  } catch {
    return null;
  }
}

function saveRemote(p: Progress) {
  // keepalive: 탭을 닫는 순간에 보낸 저장도 끝까지 가게 한다.
  fetch(REMOTE_URL, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ id: REMOTE_ID, data: p, updated_at: new Date().toISOString() }),
    keepalive: true,
  }).catch(() => {
    // 네트워크가 끊겨도 localStorage에는 남아 있고, 다음 저장 때 통째로 다시 올라간다.
  });
}

let pending: Progress | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function flushRemote() {
  clearTimeout(timer);
  if (pending) saveRemote(pending);
  pending = null;
}

function save(p: Progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 웹 저장만 쓴다
  }
  pending = p;
  clearTimeout(timer);
  timer = setTimeout(flushRemote, REMOTE_DELAY);
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const local = load();
    setProgress(local);
    setReady(true);
    loadRemote().then((remote) => {
      if (!alive) return;
      if (remote && remote.savedAt > local.savedAt) {
        // 다른 기기에서 더 최근에 공부한 기록. 이 사이에 여기서 누른 기록이 있으면 그쪽을 남긴다.
        setProgress((prev) => {
          if (prev.savedAt > remote.savedAt) return prev;
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
          } catch {}
          return remote;
        });
      } else if (local.savedAt > (remote?.savedAt ?? 0)) {
        // 웹에 아직 안 올라간 기록(예전 버전·오프라인)이 있으면 올린다.
        saveRemote(local);
      }
    });
    window.addEventListener("pagehide", flushRemote);
    return () => {
      alive = false;
      window.removeEventListener("pagehide", flushRemote);
      flushRemote();
    };
  }, []);

  const grade = useCallback((n: number, g: Grade) => {
    setProgress((prev) => {
      const t = today();
      const next: Progress = {
        ...prev,
        map: { ...prev.map, [n]: nextState(prev.map[n], g) },
        days: prev.days.includes(t) ? prev.days : [...prev.days, t].slice(-400),
        savedAt: Date.now(),
      };
      save(next);
      return next;
    });
  }, []);

  /** ‘알아요 / 다시 볼게요’. 간격 반복 기록도 같이 남겨서 나중에 복습 기능을 다시 붙일 수 있게 한다. */
  const markDone = useCallback((n: number, known: boolean) => {
    setProgress((prev) => {
      const t = today();
      const next: Progress = {
        map: { ...prev.map, [n]: nextState(prev.map[n], known ? "good" : "again") },
        days: prev.days.includes(t) ? prev.days : [...prev.days, t].slice(-400),
        done: { ...prev.done, [n]: known },
        savedAt: Date.now(),
      };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    // 초기화도 다른 기기에 퍼지도록 시각을 남긴다.
    const cleared: Progress = { ...empty, savedAt: Date.now() };
    save(cleared);
    setProgress(cleared);
  }, []);

  return { progress, ready, grade, markDone, reset };
}

export function streak(days: string[]): number {
  const set = new Set(days);
  let count = 0;
  const d = new Date();
  // 오늘 아직 공부 안 했으면 어제부터 센다
  if (!set.has(today())) d.setDate(d.getDate() - 1);
  for (;;) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!set.has(key)) break;
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
