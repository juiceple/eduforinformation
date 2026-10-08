"use client";

import { createContext, useContext } from "react";
import type { Grade, Progress } from "@/lib/progress";

export type View = "home" | "study" | "cards" | "cloze" | "quiz" | "map" | "codes";

/** 학습 범위: 오늘 복습 / 새 카드 / 약점 / 과목 / 묶음 / 전체 */
export type Scope =
  | { kind: "due" }
  | { kind: "new" }
  | { kind: "weak" }
  | { kind: "all" }
  | { kind: "subject"; id: 1 | 2 | 3 }
  | { kind: "cluster"; id: string };

export interface Nav {
  view: View;
  cluster?: string;
  scope?: Scope;
}

export interface Ctx {
  progress: Progress;
  ready: boolean;
  grade: (n: number, g: Grade) => void;
  reset: () => void;
  go: (nav: Nav) => void;
  openItem: (n: number) => void;
}

export const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("AppCtx missing");
  return c;
}
