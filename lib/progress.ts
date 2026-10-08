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
}

const empty: Progress = { map: {}, days: [] };

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

function load(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Progress;
    return { map: parsed.map ?? {}, days: parsed.days ?? [] };
  } catch {
    return empty;
  }
}

function save(p: Progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 이번 세션 동안만 유지
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProgress(load());
    setReady(true);
  }, []);

  const grade = useCallback((n: number, g: Grade) => {
    setProgress((prev) => {
      const t = today();
      const next: Progress = {
        map: { ...prev.map, [n]: nextState(prev.map[n], g) },
        days: prev.days.includes(t) ? prev.days : [...prev.days, t].slice(-400),
      };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    save(empty);
    setProgress(empty);
  }, []);

  return { progress, ready, grade, reset };
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
