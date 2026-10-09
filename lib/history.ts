"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 오답노트용 풀이 기록. 실기 테스트(단답형)와 학습노트 객관식에서 답을 낼 때마다 한 줄씩 쌓는다.
 * 문제 key: 실기 테스트 = "exam:os-01", 학습노트 객관식 = "quiz:12"(항목 번호)
 */
export interface Attempt {
  /** 푼 시각(ms) */
  at: number;
  key: string;
  /** 내가 쓴(고른) 답 */
  input: string;
  right: boolean;
  /** 학습노트 객관식: 빈칸이 있던 줄 번호와 정답 (문제가 매번 새로 만들어져서 같이 남긴다) */
  li?: number;
  answer?: string;
}

export interface History {
  attempts: Attempt[];
  /** 오답노트에서 뺀 시각. 그 뒤에 또 틀리면 다시 들어온다 */
  cleared: Record<string, number>;
}

const STORAGE_KEY = "edu-info-history-v1";
const MAX_ATTEMPTS = 5000;
const empty: History = { attempts: [], cleared: {} };

const idOf = (a: Attempt) => `${a.at}|${a.key}`;

/** 두 기기 기록을 합친다. 같은 풀이는 하나로, ‘맞게 썼어요’로 고친 쪽(정답)을 남긴다. */
function merge(a: History, b: History): History {
  const byId = new Map<string, Attempt>();
  for (const x of [...a.attempts, ...b.attempts]) {
    const prev = byId.get(idOf(x));
    if (!prev || (x.right && !prev.right)) byId.set(idOf(x), x);
  }
  const cleared = { ...a.cleared };
  for (const [k, t] of Object.entries(b.cleared)) cleared[k] = Math.max(cleared[k] ?? 0, t);
  const attempts = [...byId.values()].sort((x, y) => x.at - y.at).slice(-MAX_ATTEMPTS);
  return { attempts, cleared };
}

function normalize(p: Partial<History> | null | undefined): History {
  return { attempts: Array.isArray(p?.attempts) ? p.attempts : [], cleared: p?.cleared ?? {} };
}

function load(): History {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : empty;
  } catch {
    return empty;
  }
}

/** 웹 저장: 진행률과 같은 Supabase 테이블의 다른 행(REMOTE_ID)에 둔다. 안 되면 이 브라우저 기록만 쓴다. */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://htxlggyucplpjhiyymkt.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY ?? "sb_publishable_q3rO1yp60wHw2-f1ROdfqg_MXRSQjzF";
const REMOTE_URL = `${SUPABASE_URL}/rest/v1/edu_progress`;
const REMOTE_ID = "history";
const REMOTE_DELAY = 1500;

async function loadRemote(): Promise<History | null> {
  try {
    const res = await fetch(`${REMOTE_URL}?id=eq.${REMOTE_ID}&select=data`, { headers: { apikey: SUPABASE_KEY }, cache: "no-store" });
    if (!res.ok) return null;
    const rows = (await res.json()) as { data: Partial<History> }[];
    return rows[0] ? normalize(rows[0].data) : null;
  } catch {
    return null;
  }
}

function saveRemote(h: History) {
  fetch(REMOTE_URL, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: REMOTE_ID, data: h, updated_at: new Date().toISOString() }),
    keepalive: true,
  }).catch(() => {});
}

let pending: History | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function flushRemote() {
  clearTimeout(timer);
  if (pending) saveRemote(pending);
  pending = null;
}

function save(h: History) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  } catch {}
  pending = h;
  clearTimeout(timer);
  timer = setTimeout(flushRemote, REMOTE_DELAY);
}

export function useHistory() {
  const [history, setHistory] = useState<History>(empty);

  useEffect(() => {
    let alive = true;
    const local = load();
    setHistory(local);
    loadRemote().then((remote) => {
      if (!alive || !remote) return;
      setHistory((prev) => {
        const merged = merge(prev, remote);
        save(merged);
        return merged;
      });
    });
    window.addEventListener("pagehide", flushRemote);
    return () => {
      alive = false;
      window.removeEventListener("pagehide", flushRemote);
      flushRemote();
    };
  }, []);

  const update = useCallback((fn: (h: History) => History) => {
    setHistory((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  /** 답을 낼 때마다 한 줄 추가 */
  const log = useCallback(
    (a: Omit<Attempt, "at">) => update((h) => ({ ...h, attempts: [...h.attempts, { ...a, at: Date.now() }].slice(-MAX_ATTEMPTS) })),
    [update],
  );

  /** ‘맞게 썼어요’: 그 문제의 마지막 풀이를 정답으로 고친다 */
  const fixLast = useCallback(
    (key: string) =>
      update((h) => {
        const i = h.attempts.findLastIndex((a) => a.key === key);
        if (i < 0) return h;
        const attempts = h.attempts.slice();
        attempts[i] = { ...attempts[i], right: true };
        return { ...h, attempts };
      }),
    [update],
  );

  /** 오답노트에서 빼기 */
  const clear = useCallback((key: string) => update((h) => ({ ...h, cleared: { ...h.cleared, [key]: Date.now() } })), [update]);

  return { history, log, fixLast, clear };
}

export type HistoryApi = ReturnType<typeof useHistory>;

/** 문제별로 묶은 기록 */
export interface WrongEntry {
  key: string;
  attempts: Attempt[];
  lastWrong: Attempt;
  /** 마지막으로 틀린 뒤 연속으로 맞힌 횟수 */
  streak: number;
}

/** 오답노트: 틀린 적이 있고, 그 뒤로 ‘빼기’를 하지 않은 문제. 최근에 틀린 순 */
export function wrongEntries(h: History): WrongEntry[] {
  const groups = new Map<string, Attempt[]>();
  for (const a of h.attempts) {
    const list = groups.get(a.key);
    if (list) list.push(a);
    else groups.set(a.key, [a]);
  }
  const out: WrongEntry[] = [];
  for (const [key, attempts] of groups) {
    const lastWrong = attempts.findLast((a) => !a.right);
    if (!lastWrong || lastWrong.at <= (h.cleared[key] ?? 0)) continue;
    out.push({ key, attempts, lastWrong, streak: attempts.filter((a) => a.at > lastWrong.at && a.right).length });
  }
  return out.sort((x, y) => y.lastWrong.at - x.lastWrong.at);
}

export function dateKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
